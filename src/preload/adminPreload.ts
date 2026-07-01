import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants/ipcChannels';

const adminAPI = {
  // Browser & Capture
  scanBrowsers: () => ipcRenderer.invoke(IPC_CHANNELS.BROWSER_SCAN),
  listTabs: (browserId: string) => ipcRenderer.invoke(IPC_CHANNELS.BROWSER_LIST_TABS, browserId),
  selectTab: (tabId: string) => ipcRenderer.invoke(IPC_CHANNELS.BROWSER_SELECT_TAB, tabId),
  getSelectedTab: () => ipcRenderer.invoke(IPC_CHANNELS.BROWSER_GET_SELECTED),
  getThumbnail: (tabId: string) => ipcRenderer.invoke(IPC_CHANNELS.BROWSER_GET_THUMBNAIL, tabId),
  executeCapture: () => ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_EXECUTE),
  executeManualCapture: (sourceType: string) => ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_EXECUTE_MANUAL, sourceType),

  // AI
  aiAsk: (params: { imageBase64: string; question?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_ASK, params),
  listProviders: () => ipcRenderer.invoke(IPC_CHANNELS.AI_LIST_PROVIDERS),
  addProvider: (provider: any) => ipcRenderer.invoke(IPC_CHANNELS.AI_ADD_PROVIDER, provider),
  updateProvider: (id: string, updates: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_UPDATE_PROVIDER, id, updates),
  deleteProvider: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AI_DELETE_PROVIDER, id),
  testConnection: (providerId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_TEST_CONNECTION, providerId),
  setActiveProvider: (providerId: string, modelId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_SET_ACTIVE_PROVIDER, providerId, modelId),

  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL),
  getSetting: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),
  setSetting: (key: string, value: any) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),
  resetSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_RESET),

  // History
  listHistory: (params: { page: number; pageSize: number }) =>
    ipcRenderer.invoke(IPC_CHANNELS.HISTORY_LIST, params),
  searchHistory: (query: string, page: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.HISTORY_SEARCH, query, page),
  getHistoryDetail: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_GET_DETAIL, id),
  deleteHistory: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_DELETE, id),
  deleteHistoryBatch: (ids: string[]) => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_DELETE_BATCH, ids),
  clearAllHistory: () => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_CLEAR_ALL),

  // Window
  launchFloatingWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_LAUNCH_FLOAT),
  closeFloatingWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE_FLOAT),
  setFloatPosition: (position: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SET_FLOAT_POSITION, position),
  setAlwaysOnTop: (enabled: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SET_ALWAYS_ON_TOP, enabled),
  minimizeToTray: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE_TO_TRAY),
  getFloatStatus: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_GET_FLOAT_STATUS),

  // Events
  onFloatStatusChanged: (callback: (data: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.EVENT_FLOAT_STATUS_CHANGED, (_e, data) => callback(data));
  },
  onBrowserDisconnected: (callback: (data: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.EVENT_BROWSER_DISCONNECTED, (_e, data) => callback(data));
  },
  onCaptureProgress: (callback: (data: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.EVENT_CAPTURE_PROGRESS, (_e, data) => callback(data));
  },
};

contextBridge.exposeInMainWorld('adminAPI', adminAPI);

export type AdminAPI = typeof adminAPI;
