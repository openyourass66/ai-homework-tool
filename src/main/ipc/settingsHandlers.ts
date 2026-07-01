import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/ipcChannels';
import { storageService } from '../services/storageService';
import { DEFAULT_SETTINGS } from '../../shared/constants/defaults';
import type { AppSettings } from '../../shared/types/settings';

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL, () => {
    return storageService.getSettings();
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, (_e, key: string) => {
    const settings = storageService.getSettings();
    return (settings as any)[key];
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_e, key: string, value: any) => {
    const settings = storageService.getSettings();
    (settings as any)[key] = value;
    storageService.saveSettings(settings);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_RESET, () => {
    storageService.saveSettings({ ...DEFAULT_SETTINGS });
    return { success: true };
  });
}
