import { BrowserWindow, screen, app } from 'electron';
import path from 'path';

let floatingWindow: BrowserWindow | null = null;

export function createFloatingWindow(): BrowserWindow {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.focus();
    return floatingWindow;
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const winWidth = 420;
  const winHeight = 320;

  floatingWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: width - winWidth - 20,
    y: 60,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    transparent: true,
    title: 'AI 助手',
    webPreferences: {
      preload: path.join(__dirname, '../../preload/floatingPreload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,  // Required: preload script needs require() for local modules
    },
  });

  // Use local-app protocol (same as admin window)
  // Use 'a' as dummy host so absolute asset paths (/assets/...) resolve correctly
  floatingWindow.loadURL('local-app://a/floating/index.html');

  floatingWindow.on('closed', () => {
    floatingWindow = null;
  });

  return floatingWindow;
}

export function getFloatingWindow(): BrowserWindow | null {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    return floatingWindow;
  }
  return null;
}

export function closeFloatingWindow(): void {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.close();
    floatingWindow = null;
  }
}

export function setFloatingWindowPosition(
  position: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
): void {
  const win = getFloatingWindow();
  if (!win) return;

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const bounds = win.getBounds();
  const margin = 20;

  let x: number, y: number;
  switch (position) {
    case 'top-right':
      x = width - bounds.width - margin;
      y = margin;
      break;
    case 'bottom-right':
      x = width - bounds.width - margin;
      y = height - bounds.height - margin;
      break;
    case 'top-left':
      x = margin;
      y = margin;
      break;
    case 'bottom-left':
      x = margin;
      y = height - bounds.height - margin;
      break;
  }

  win.setPosition(x, y);
}
