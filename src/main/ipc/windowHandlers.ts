import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/ipcChannels';
import {
  createFloatingWindow,
  closeFloatingWindow,
  getFloatingWindow,
  setFloatingWindowPosition,
} from '../windows/floatingWindow';
import { showAdminWindow } from '../windows/adminWindow';

export function registerWindowHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.WINDOW_LAUNCH_FLOAT, () => {
    const win = createFloatingWindow();
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE_FLOAT, () => {
    closeFloatingWindow();
    return { success: true };
  });

  ipcMain.handle(
    IPC_CHANNELS.WINDOW_SET_FLOAT_POSITION,
    (_e, position: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left') => {
      setFloatingWindowPosition(position);
      return { success: true };
    }
  );

  ipcMain.handle(IPC_CHANNELS.WINDOW_SET_ALWAYS_ON_TOP, (_e, enabled: boolean) => {
    const win = getFloatingWindow();
    if (win) {
      win.setAlwaysOnTop(enabled);
    }
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE_TO_TRAY, () => {
    const adminWin = require('../windows/adminWindow').getAdminWindow();
    if (adminWin) {
      adminWin.hide();
    }
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_GET_FLOAT_STATUS, () => {
    const win = getFloatingWindow();
    return {
      visible: win ? win.isVisible() : false,
      position: 'top-right',
    };
  });
}
