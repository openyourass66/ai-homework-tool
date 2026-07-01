import { CDPConnection } from './connection';
import type { CDPTab } from './tabEnumerator';

export interface CaptureOptions {
  format?: 'jpeg' | 'png';
  quality?: number; // 0-100, only for jpeg
  clip?: { x: number; y: number; width: number; height: number; scale: number };
}

export interface CaptureResult {
  data: string; // base64-encoded image
  timestamp: number;
  sourceType: 'cdp';
  sourceUrl?: string;
  sourceTitle?: string;
}

const connectionPool = new Map<string, CDPConnection>();

async function getOrCreateConnection(wsUrl: string): Promise<CDPConnection> {
  let conn = connectionPool.get(wsUrl);
  if (conn && conn.isConnected()) {
    return conn;
  }

  // Clean up old connection
  if (conn) {
    conn.close();
  }

  conn = new CDPConnection(wsUrl);
  await conn.connect();

  // Enable Page domain
  await conn.send('Page.enable');

  connectionPool.set(wsUrl, conn);
  return conn;
}

export async function captureTab(
  tab: CDPTab,
  options: CaptureOptions = {}
): Promise<CaptureResult> {
  const { format = 'jpeg', quality = 80, clip } = options;

  const conn = await getOrCreateConnection(tab.webSocketDebuggerUrl);

  const result = await conn.send('Page.captureScreenshot', {
    format,
    quality: format === 'jpeg' ? quality : undefined,
    clip,
    captureBeyondViewport: false,
    fromSurface: true,
  });

  if (result.error) {
    throw new Error(`CDP capture failed: ${result.error.message}`);
  }

  return {
    data: result.data,
    timestamp: Date.now(),
    sourceType: 'cdp',
    sourceUrl: tab.url,
    sourceTitle: tab.title,
  };
}

export function closeAllConnections(): void {
  for (const [, conn] of connectionPool) {
    conn.close();
  }
  connectionPool.clear();
}
