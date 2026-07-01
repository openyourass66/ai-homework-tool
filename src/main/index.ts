import { app, globalShortcut, Tray, Menu, nativeImage, protocol } from 'electron';
import { createAdminWindow, showAdminWindow, getAdminWindow } from './windows/adminWindow';
import { createFloatingWindow, closeFloatingWindow, getFloatingWindow } from './windows/floatingWindow';
import { registerAllHandlers } from './ipc/index';
import { storageService } from './services/storageService';
import { aiService } from './services/aiService';
import path from 'path';
import fs from 'fs';

let tray: Tray | null = null;
(app as any).isQuitting = false;

function registerCustomProtocol(): void {
  const distPath = path.join(__dirname, '../../renderer');

  const mimeTypes: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };

  protocol.handle('local-app', (request) => {
    const url = new URL(request.url);
    // Only use pathname — host is just a placeholder to make URL resolution work
    let pathname = url.pathname.replace(/^\//, '') || 'admin/index.html';
    const filePath = path.join(distPath, pathname);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      console.error(`[local-app] 404: ${request.url} -> ${filePath}`);
      return new Response('404 Not Found', { status: 404 });
    }

    const ext = path.extname(filePath).toLowerCase();
    const data = fs.readFileSync(filePath);
    const reqOrigin = request.headers.get('origin') || '*';
    console.log(`[local-app] 200: ${request.url} (${mimeTypes[ext] || 'octet-stream'})`);
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Access-Control-Allow-Origin': reqOrigin,
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'no-cache',
      },
    });
  });
}

app.whenReady().then(() => {
  // Register custom protocol before creating any windows
  registerCustomProtocol();

  // Init storage
  storageService.init();

  // Restore settings and AI providers
  const settings = storageService.getSettings();
  for (const provider of settings.providers) {
    aiService.addProvider(provider);
  }
  if (settings.activeAIProvider) {
    aiService.setActive(settings.activeAIProvider, settings.activeAIModel);
  }

  // Register IPC handlers
  registerAllHandlers();

  // Create windows
  createAdminWindow();

  // Setup tray
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示设置', click: () => showAdminWindow() },
    {
      label: '切换识别窗口',
      click: () => {
        if (getFloatingWindow()) { closeFloatingWindow(); }
        else { createFloatingWindow(); }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => { (app as any).isQuitting = true; app.quit(); },
    },
  ]);

  tray.setToolTip('AI 屏幕助手');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => showAdminWindow());

  // Global hotkey
  globalShortcut.register(settings.general.globalHotkey || 'Ctrl+Shift+Q', () => {
    const floatWin = getFloatingWindow();
    if (floatWin && floatWin.isVisible()) {
      floatWin.webContents.send('event:global-hotkey-pressed');
    } else {
      createFloatingWindow();
    }
  });

  app.on('activate', () => {
    if (getAdminWindow() === null) { createAdminWindow(); }
    else { showAdminWindow(); }
  });
});

app.on('before-quit', () => { (app as any).isQuitting = true; });
app.on('will-quit', () => { globalShortcut.unregisterAll(); });
