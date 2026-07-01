export interface CDPTab {
  id: string;
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
  faviconUrl?: string;
  browserPort: number;
  type: string;
}

interface CDPJsonTarget {
  id: string;
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
  faviconUrl?: string;
  type: string;
}

export async function enumerateTabs(port: number): Promise<CDPTab[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const resp = await fetch(`http://127.0.0.1:${port}/json`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      return [];
    }

    const targets: CDPJsonTarget[] = await resp.json();

    return targets
      .filter((t) => t.type === 'page')
      .map((t) => ({
        id: t.id,
        title: t.title || 'Untitled',
        url: t.url || '',
        webSocketDebuggerUrl: t.webSocketDebuggerUrl,
        faviconUrl: t.faviconUrl,
        browserPort: port,
        type: t.type,
      }));
  } catch {
    return [];
  }
}
