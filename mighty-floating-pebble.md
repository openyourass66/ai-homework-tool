# AI 桌面识别助手 — 技术方案

## 项目概述

一款 Windows 桌面应用，核心功能是通过截图 + 多模态 AI 大模型识别窗口内的题目，直接给出答案和简单解析。

**两大组件：**
- **管理后台**：配置 AI 模型、选择识别目标窗口（含浏览器标签页）、历史搜索、各类设置
- **浮动识别窗口**：置顶小窗，一键截取目标窗口，AI 分析后显示答案

---

## 1. 技术栈选型

| 层次 | 选择 | 原因 |
|------|------|------|
| 桌面框架 | **Electron 31+** | 原生支持 CDP（Chrome DevTools Protocol）截取浏览器标签页；成熟的多窗口管理（置顶/无边框） |
| 语言 | **TypeScript 5.x** | 全栈类型安全（main/preload/renderer） |
| 前端 | **React 18 + Zustand + Tailwind CSS** | 轻量状态管理；快速 UI 开发 |
| 构建 | **Vite**（renderer）+ **tsc**（main） | HMR 开发体验；标准 Node 编译 |
| 数据库 | **better-sqlite3** + **electron-store** | SQLite 管理历史（FTS5 全文搜索）；JSON 存配置 |
| 图片处理 | **sharp** | 高性能压缩/缩放，比 Jimp 快 5-10 倍 |
| AI SDK | **openai** + **@anthropic-ai/sdk** | 原生 SDK 处理流式、重试、错误 |
| CDP 客户端 | **puppeteer-core** | 连接外部 Chrome/Edge，发送 `Page.captureScreenshot` |
| 打包 | **electron-builder**（NSIS） | Windows 安装包标准方案 |

**选 Electron 而非 Tauri 的关键原因：** 需要 CDP 协议连接外部 Chrome/Edge 实例来截取浏览器标签页（Tauri 的 WebView2 无法做到）。

---

## 2. 架构概览

```
┌─────────────────────────────────────────────────┐
│              MAIN PROCESS (Node.js)              │
│                                                 │
│  WindowManager    BrowserConnector(CDP)          │
│  - adminWindow    - discoverChrome()             │
│  - floatingWindow - enumerateTabs()              │
│                   - captureTab()                 │
│                                                 │
│  IPC Router       ScreenCaptureService          │
│  (ipcMain.handle) - CDP capture (Tier 1)        │
│                   - Window capture (Tier 2)      │
│  AIService        - Screen capture (Tier 3)      │
│  - OpenAI 适配器                                 │
│  - Anthropic 适配器  ImageProcessor              │
│  - Gemini 适配器     - resize/compress           │
│  - 自定义适配器      - toBase64                  │
│                                                 │
│  StorageService                                 │
│  - history CRUD + FTS5                          │
│  - settings R/W (electron-store)                │
└──────────┬──────────────────────┬───────────────┘
           │ IPC (contextBridge)  │ IPC
           ▼                      ▼
┌──────────────────┐  ┌──────────────────────────┐
│  ADMIN WINDOW    │  │  FLOATING WINDOW          │
│  (React SPA)     │  │  (React, 置顶小窗)        │
│                  │  │                           │
│  - 模型配置      │  │  - 一键截图按钮            │
│  - 浏览器/标签页 │  │  - AI 答案展示面板         │
│  - 历史搜索      │  │  - 状态指示灯              │
│  - 系统设置      │  │  - 快捷模型切换            │
│  - 启动浮窗按钮  │  │                           │
└──────────────────┘  └──────────────────────────┘
```

---

## 3. 核心流程

```
用户点击"截图提问" (或全局快捷键 Ctrl+Shift+Q)
  │
  ▼
1. ScreenCaptureService 执行截图
   ├── Tier 1: CDP Page.captureScreenshot (首选，可截后台标签页)
   ├── Tier 2: desktopCapturer.getSources({types:['window']}) (备选)
   └── Tier 3: desktopCapturer.getSources({types:['screen']}) (兜底)
  │
  ▼
2. ImageProcessor 预处理
   - 缩放到 max 2048px
   - 转 JPEG quality 80，目标 < 1MB
  │
  ▼
3. AIService 调用多模态模型
   - 发送 system prompt（题目识别提示词）+ 图片
   - 支持 OpenAI GPT-4V/4o、Claude Vision、Gemini Vision、自定义兼容 API
  │
  ▼
4. 结果返回浮动窗口展示
   - Markdown 渲染答案 + 解析
   - 同时存入 SQLite 历史记录
```

---

## 4. 浏览器标签页选择（关键难点）

### CDP 方式（核心方案）

Chrome/Edge 开启远程调试端口后，通过 HTTP + WebSocket 协议：
1. **发现浏览器**：扫描 `localhost:9222-9230` 端口，请求 `/json/version` 识别浏览器类型
2. **枚举标签页**：`GET /json` 获取所有 `type: 'page'` 的目标列表
3. **选中标签页截图**：WebSocket 连接 `webSocketDebuggerUrl`，发送 `Page.captureScreenshot`

**优势：** 可以截取后台标签页，不需要窗口可见。浮动窗口可以置顶显示，同时截取后台浏览器内容。

### 用户引导

多数用户不会以调试模式启动浏览器。提供两种方式：
- **检测现有进程**：通过 WMIC 检测 Chrome 进程命令行是否含 `--remote-debugging-port`
- **引导重启**：UI 提示用户关闭浏览器，点击按钮自动带参数重启（保留 `--user-data-dir` 和 `--restore-last-session`）

---

## 5. AI 模型集成

### 支持的提供商

| 提供商 | 适配器 | 模型示例 |
|--------|--------|---------|
| OpenAI | `OpenAIAdapter` | gpt-4o, gpt-4-turbo |
| Anthropic | `AnthropicAdapter` | claude-sonnet-4-6, claude-opus-4-7 |
| Google | `GoogleGeminiAdapter` | gemini-2.5-pro, gemini-2.5-flash |
| Azure OpenAI | 复用 `OpenAIAdapter` | 自定义部署 |
| 自定义兼容 | `CustomOpenAICompatibleAdapter` | Ollama, DeepSeek, Groq, LM Studio 等 |

### API Key 安全

使用 Electron `safeStorage.encryptString()`（Windows 上为 DPAPI，绑定用户账户）加密存储 API Key。

---

## 6. 数据存储

### electron-store（配置）
```json
{
  "providers": [{ "id", "name", "type", "apiKey", "endpoint", "models" }],
  "activeAIProvider": "uuid",
  "activeAIModel": "gpt-4o",
  "selectedTabId": "cdp-tab-xxx",
  "floatWindow": { "position": "top-right", "width": 420, "height": 300 },
  "capture": { "jpegQuality": 80, "maxImageWidth": 1920 }
}
```

### SQLite（历史记录）
```sql
CREATE TABLE queries (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  screenshot_path TEXT,
  answer_summary TEXT,       -- 前 500 字符
  answer_full TEXT,
  model_used TEXT,
  source_url TEXT,
  source_title TEXT,
  latency_ms INTEGER,
  status TEXT DEFAULT 'success'
);
-- FTS5 全文搜索
CREATE VIRTUAL TABLE queries_fts USING fts5(
  question_text, answer_full, source_title, source_url
);
```

---

## 7. 项目目录结构

```
ai-screen-assistant/
├── src/
│   ├── main/                     # 主进程
│   │   ├── index.ts              # 入口：生命周期、窗口创建、托盘
│   │   ├── windows/              # adminWindow.ts, floatingWindow.ts
│   │   ├── ipc/                  # captureHandlers, aiHandlers, historyHandlers, settingsHandlers
│   │   ├── services/             # screenCapture, browserConnector, aiService, storageService, imageProcessor
│   │   ├── cdp/                  # connection, tabEnumerator, pageCapture, browserDetector
│   │   └── prompts/              # questionRecognizer, answerFormatter
│   ├── preload/                  # adminPreload.ts, floatingPreload.ts
│   ├── renderer/
│   │   ├── admin/                # 管理后台 React SPA
│   │   │   ├── components/       # layout/, models/, browser/, history/, settings/
│   │   │   └── stores/           # Zustand stores
│   │   └── floating/             # 浮动窗口 React 轻量应用
│   └── shared/                   # 共享类型和常量
│       ├── types/                # ipc.ts, ai.ts, browser.ts, history.ts, settings.ts
│       └── constants/            # ipcChannels.ts, defaults.ts
├── resources/                    # 图标等资源
└── tests/                        # 单元测试 + e2e
```

---

## 8. 实施阶段

### Phase 1：项目基础（骨架）
- 搭建 Electron + Vite + React + TypeScript 项目
- 主进程：创建管理窗口和浮动窗口
- Preload + IPC 通道框架，类型安全的 handler 注册
- 全局快捷键、托盘图标

### Phase 2：浏览器发现与截图
- CDP 浏览器发现（端口扫描 + `/json/version`）
- 标签页枚举（`/json` 端点解析）
- WebSocket 连接 + `Page.captureScreenshot` 截图
- 管理后台浏览器/标签页选择 UI
- 窗口截图和屏幕截图作为降级方案

### Phase 3：AI 模型集成
- OpenAI / Anthropic / Gemini / 自定义兼容适配器
- 图片预处理（sharp 压缩）
- 模型配置 UI（API Key、Endpoint、模型选择、连接测试）
- 截图 → AI 分析 → 展示答案 全流程贯通

### Phase 4：历史与设置
- SQLite + electron-store 存储
- FTS5 全文搜索历史
- 历史列表、详情、删除、导出
- 设置页面（通用、截图、模型）

### Phase 5：浮动窗口 UX
- 置顶小窗（毛玻璃/半透明效果）
- 一键截图按钮 + 加载动画
- 答案面板（Markdown 渲染）
- 拖拽 + 贴边吸附 + 自动隐藏
- 快捷模型切换

### Phase 6：测试与打包
- 单元测试 + 集成测试
- electron-builder NSIS 安装包
- 自动更新（electron-updater）
- 错误监控

---

## 9. 验证方式

1. **开发阶段**：`npm run dev` 启动 Vite + Electron，管理后台可见，可打开浮动窗口
2. **截图验证**：启动 Chrome（带 `--remote-debugging-port=9222`），在管理后台选择标签页，点击截图，确认能获取到截图
3. **AI 验证**：配置 API Key，截图后发送给 AI，确认能返回识别结果
4. **历史验证**：多次截图提问后，在历史页面搜索，确认 FTS5 搜索可用
5. **打包验证**：`npm run build` 生成 NSIS 安装包，安装后完整走通流程
