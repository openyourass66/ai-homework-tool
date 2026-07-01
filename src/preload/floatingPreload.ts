import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants/ipcChannels';

const floatingAPI = {
  executeCapture: () => ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_EXECUTE),
  aiAsk: (params: { imageBase64: string; question?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.AI_ASK, params),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL),
  getSelectedTab: () => ipcRenderer.invoke(IPC_CHANNELS.BROWSER_GET_SELECTED),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE_FLOAT),
  setAlwaysOnTop: (enabled: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SET_ALWAYS_ON_TOP, enabled),

  onCaptureProgress: (callback: (data: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.EVENT_CAPTURE_PROGRESS, (_e, data) => callback(data));
  },
  onGlobalHotkey: (callback: () => void) => {
    ipcRenderer.on('event:global-hotkey-pressed', () => callback());
  },
};

contextBridge.exposeInMainWorld('floatingAPI', floatingAPI);

export type FloatingAPI = typeof floatingAPI;
