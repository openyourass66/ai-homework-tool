import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/ipcChannels';
import { browserConnector } from '../services/browserConnector';
import { executeCapture } from '../services/screenCapture';

export function registerCaptureHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.BROWSER_SCAN, async () => {
    const browsers = await browserConnector.scan();
    return browsers;
  });

  ipcMain.handle(IPC_CHANNELS.BROWSER_LIST_TABS, async (_e, browserId: string) => {
    const tabs = await browserConnector.listTabs(browserId);
    return tabs;
  });

  ipcMain.handle(IPC_CHANNELS.BROWSER_SELECT_TAB, async (_e, tab: { id: string; title: string; url: string; webSocketDebuggerUrl: string; browserPort: number }) => {
    browserConnector.selectTab(tab as any);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.BROWSER_GET_SELECTED, async () => {
    return browserConnector.getSelectedTab();
  });

  ipcMain.handle(IPC_CHANNELS.BROWSER_GET_THUMBNAIL, async (_e, tabId: string) => {
    try {
      // Small low-res capture for preview
      const result = await browserConnector.captureSelected();
      return result.data;
    } catch {
      return null;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_EXECUTE, async (event) => {
    try {
      // Send progress to renderer
      const sender = BrowserWindow.fromWebContents(event.sender);
      if (sender) {
        sender.webContents.send(IPC_CHANNELS.EVENT_CAPTURE_PROGRESS, {
          stage: 'capturing',
          progress: 30,
        });
      }

      const result = await executeCapture();

      if (sender) {
        sender.webContents.send(IPC_CHANNELS.EVENT_CAPTURE_PROGRESS, {
          stage: 'done',
          progress: 100,
        });
      }

      return result;
    } catch (err: any) {
      return {
        data: '',
        timestamp: Date.now(),
        sourceType: 'screen' as const,
        error: err.message,
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_EXECUTE_MANUAL, async (_e, sourceType: string) => {
    try {
      const result = await executeCapture();
      return result;
    } catch (err: any) {
      return {
        data: '',
        timestamp: Date.now(),
        sourceType: 'screen' as const,
        error: err.message,
      };
    }
  });
}
