import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/ipcChannels';
import { storageService } from '../services/storageService';

export function registerHistoryHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.HISTORY_LIST, async (_e, params: { page: number; pageSize: number }) => {
    const { page = 1, pageSize = 20 } = params;
    return storageService.listEntries(page, pageSize);
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_SEARCH, async (_e, query: string, page: number) => {
    if (!query || query.trim().length === 0) {
      return storageService.listEntries(page || 1, 20);
    }
    return storageService.searchEntries(query, page || 1, 20);
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_GET_DETAIL, async (_e, id: string) => {
    return storageService.getEntry(id);
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_DELETE, async (_e, id: string) => {
    storageService.deleteEntry(id);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_DELETE_BATCH, async (_e, ids: string[]) => {
    storageService.deleteEntries(ids);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_CLEAR_ALL, async () => {
    storageService.clearAll();
    return { success: true };
  });
}
