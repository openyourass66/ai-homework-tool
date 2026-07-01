export interface BrowserInstance {
  id: string;
  name: string;
  type: 'chrome' | 'edge' | 'brave' | 'chromium' | 'unknown';
  debugPort: number;
}

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
  faviconUrl?: string;
  browserInstancePort: number;
}
