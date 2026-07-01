import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DiscoveredBrowser {
  id: string;
  name: string;
  type: 'chrome' | 'edge' | 'brave' | 'chromium' | 'unknown';
  debugPort: number;
  userDataDir?: string;
}

const CDP_PORTS = [9222, 9223, 9224, 9225, 9229, 9230, 9220, 9221];

async function tryPort(port: number): Promise<DiscoveredBrowser | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const resp = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;

    const info = await resp.json();
    const browserName = info.Browser || '';

    let type: DiscoveredBrowser['type'] = 'unknown';
    if (browserName.includes('Edg')) type = 'edge';
    else if (browserName.includes('Brave')) type = 'brave';
    else if (browserName.includes('Chrome')) type = 'chrome';
    else if (browserName.includes('Chromium')) type = 'chromium';

    return {
      id: `cdp-${port}`,
      name: browserName || `Chromium (port ${port})`,
      type,
      debugPort: port,
      userDataDir: info.UserDataDir,
    };
  } catch {
    return null;
  }
}

async function findDebugPortsFromProcesses(): Promise<number[]> {
  const ports: number[] = [];

  try {
    // Use WMIC on Windows to find Chrome/Edge debug ports from command lines
    if (process.platform === 'win32') {
      const { stdout } = await execAsync(
        'wmic process where "name like \'%chrome%\' or name like \'%msedge%\'" get commandline 2>nul',
        { timeout: 5000 }
      );

      const re = /--remote-debugging-port[= ](\d+)/g;
      let match: RegExpExecArray | null;
      while ((match = re.exec(stdout)) !== null) {
        const port = parseInt(match[1], 10);
        if (!ports.includes(port)) {
          ports.push(port);
        }
      }
    } else {
      // Linux/macOS: use ps
      const { stdout } = await execAsync(
        'ps aux | grep -E "chrome|chromium|edge|brave" | grep -v grep',
        { timeout: 5000 }
      );

      const re = /--remote-debugging-port[= ](\d+)/g;
      let match: RegExpExecArray | null;
      while ((match = re.exec(stdout)) !== null) {
        const port = parseInt(match[1], 10);
        if (!ports.includes(port)) {
          ports.push(port);
        }
      }
    }
  } catch {
    // Process scanning is best-effort
  }

  return ports;
}

export async function discoverBrowsers(): Promise<DiscoveredBrowser[]> {
  const results: DiscoveredBrowser[] = [];
  const scannedPorts = new Set<number>();

  // First try common ports
  const promises = CDP_PORTS.map(async (port) => {
    scannedPorts.add(port);
    const browser = await tryPort(port);
    return browser;
  });

  const portResults = await Promise.all(promises);
  for (const b of portResults) {
    if (b) results.push(b);
  }

  // Also scan ports found from process command lines
  const processPorts = await findDebugPortsFromProcesses();
  for (const port of processPorts) {
    if (!scannedPorts.has(port)) {
      const browser = await tryPort(port);
      if (browser) results.push(browser);
    }
  }

  return results;
}
