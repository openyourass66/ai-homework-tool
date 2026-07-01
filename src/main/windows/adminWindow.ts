import { BrowserWindow, app } from 'electron';
import path from 'path';

let adminWindow: BrowserWindow | null = null;

export function createAdminWindow(): BrowserWindow {
  if (adminWindow && !adminWindow.isDestroyed()) {
    adminWindow.focus();
    return adminWindow;
  }

  adminWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    title: 'AI 屏幕助手 - 设置',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../../preload/adminPreload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,  // Required: preload script needs require() for local modules
      devTools: true,
    },
  });

  // Use 'a' as dummy host so absolute asset paths (/assets/...) resolve correctly
  adminWindow.loadURL('local-app://a/admin/index.html');

  adminWindow.once('ready-to-show', () => {
    adminWindow?.show();
  });

  adminWindow.on('close', (e) => {
    const isQuitting = (app as any).isQuitting;
    if (adminWindow && !isQuitting) {
      e.preventDefault();
      adminWindow.hide();
    }
  });

  adminWindow.on('closed', () => {
    adminWindow = null;
  });

  // Log subresource load failures (CSS, JS, etc.)
  adminWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('ADMIN PAGE LOAD FAILED:', code, desc, url);
  });

  // Capture renderer console errors for debugging
  adminWindow.webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) { // 0=verbose, 1=info, 2=warning, 3=error
      console.log(`[RENDERER ${level === 3 ? 'ERROR' : 'WARN'}] ${message}`);
    }
  });

  return adminWindow;
}

export function getAdminWindow(): BrowserWindow | null {
  if (adminWindow && !adminWindow.isDestroyed()) {
    return adminWindow;
  }
  return null;
}

export function showAdminWindow(): void {
  const win = getAdminWindow() || createAdminWindow();
  win.show();
  win.focus();
}
