import { discoverBrowsers, type DiscoveredBrowser } from '../cdp/browserDetector';
import { enumerateTabs, type CDPTab } from '../cdp/tabEnumerator';
import { captureTab, closeAllConnections, type CaptureResult } from '../cdp/pageCapture';

class BrowserConnector {
  private browsers: DiscoveredBrowser[] = [];
  private tabsCache = new Map<number, CDPTab[]>();
  private selectedTab: CDPTab | null = null;

  async scan(): Promise<DiscoveredBrowser[]> {
    this.browsers = await discoverBrowsers();
    this.tabsCache.clear();
    return this.browsers;
  }

  getBrowsers(): DiscoveredBrowser[] {
    return this.browsers;
  }

  async listTabs(browserId: string): Promise<CDPTab[]> {
    const browser = this.browsers.find((b) => b.id === browserId);
    if (!browser) return [];

    const tabs = await enumerateTabs(browser.debugPort);
    this.tabsCache.set(browser.debugPort, tabs);
    return tabs;
  }

  selectTab(tab: CDPTab): void {
    this.selectedTab = tab;
  }

  getSelectedTab(): CDPTab | null {
    return this.selectedTab;
  }

  async captureSelected(): Promise<CaptureResult> {
    if (!this.selectedTab) {
      throw new Error('No tab selected');
    }
    return captureTab(this.selectedTab, { format: 'jpeg', quality: 80 });
  }

  cleanup(): void {
    closeAllConnections();
  }
}

export const browserConnector = new BrowserConnector();
