import type { AIProvider } from './ai';

export interface AppSettings {
  version: number;
  general: {
    launchOnStartup: boolean;
    minimizeToTray: boolean;
    language: string;
    globalHotkey: string;
  };
  capture: {
    method: 'cdp' | 'window' | 'screen';
    jpegQuality: number;
    maxImageWidth: number;
    maxImageBytes: number;
    captureDelay: number;
  };
  floatWindow: {
    position: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
    width: number;
    height: number;
    alwaysOnTop: boolean;
    opacity: number;
    autoHideDelay: number;
  };
  activeAIProvider: string;
  activeAIModel: string;
  selectedTabId: string | null;
  selectedBrowserPort: number | null;
  providers: AIProvider[];
  recognitionPrompt: string;
  answerPrompt: string;
}
