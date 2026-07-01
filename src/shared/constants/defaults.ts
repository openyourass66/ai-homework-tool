import type { AppSettings } from '../types/settings';

export const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  general: {
    launchOnStartup: false,
    minimizeToTray: true,
    language: 'zh-CN',
    globalHotkey: 'Ctrl+Shift+Q',
  },
  capture: {
    method: 'cdp',
    jpegQuality: 80,
    maxImageWidth: 1920,
    maxImageBytes: 2 * 1024 * 1024,
    captureDelay: 500,
  },
  floatWindow: {
    position: 'top-right',
    width: 420,
    height: 320,
    alwaysOnTop: true,
    opacity: 0.95,
    autoHideDelay: 0,
  },
  activeAIProvider: '',
  activeAIModel: '',
  selectedTabId: null,
  selectedBrowserPort: null,
  providers: [],
  recognitionPrompt: `You are an AI assistant analyzing a screenshot. Your task:

1. IDENTIFY any questions, problems, exercises, forms, or tasks visible in the screenshot.
2. For each identified item, determine:
   - What is being asked?
   - What subject/domain is this? (e.g., programming, math, language, general knowledge)
   - What context clues are visible?
3. If the screen contains a form to fill, identify what information is needed.
4. If the screen contains an error message, identify the error and possible causes.

Respond in Chinese (Simplified) by default. Use English only when the content is in English.

Format your response:
**识别到的问题：**
[list each problem found]

**建议的解决方案：**
[provide answer/explanation for the primary problem]`,
  answerPrompt: 'Provide a concise answer with a clear explanation.',
};
