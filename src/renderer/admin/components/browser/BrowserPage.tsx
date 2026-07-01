import React, { useState, useEffect, useCallback } from 'react';

interface Browser {
  id: string;
  name: string;
  type: string;
  debugPort: number;
}

interface Tab {
  id: string;
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
  browserPort: number;
}

export function BrowserPage() {
  const [scanning, setScanning] = useState(false);
  const [browsers, setBrowsers] = useState<Browser[]>([]);
  const [expandedBrowser, setExpandedBrowser] = useState<string | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [loadingTabs, setLoadingTabs] = useState(false);
  const [selectedTab, setSelectedTab] = useState<Tab | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const api = (window as any).adminAPI;

  useEffect(() => {
    // Load selected tab on mount
    if (api) {
      api.getSelectedTab().then((tab: Tab | null) => {
        if (tab) setSelectedTab(tab);
      });
    }
  }, []);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setStatusMsg('正在扫描浏览器...');
    try {
      const result = await api.scanBrowsers();
      setBrowsers(result || []);
      if (result?.length === 0) {
        setStatusMsg('未发现浏览器，请确保 Chrome/Edge 以 --remote-debugging-port=9222 参数启动');
      } else {
        setStatusMsg(`发现 ${result.length} 个浏览器实例`);
      }
    } catch (err: any) {
      setStatusMsg('扫描失败：' + err.message);
    } finally {
      setScanning(false);
    }
  }, [api]);

  const handleListTabs = useCallback(async (browserId: string) => {
    if (expandedBrowser === browserId) {
      setExpandedBrowser(null);
      return;
    }
    setExpandedBrowser(browserId);
    setLoadingTabs(true);
    try {
      const result = await api.listTabs(browserId);
      setTabs(result || []);
    } finally {
      setLoadingTabs(false);
    }
  }, [expandedBrowser, api]);

  const handleSelectTab = useCallback(async (tab: Tab) => {
    await api.selectTab(tab);
    setSelectedTab(tab);
    setStatusMsg(`已选择：${tab.title}`);
  }, [api]);

  const browserTypeIcon = (type: string) => {
    switch (type) {
      case 'chrome': return '🌐';
      case 'edge': return '🔷';
      case 'brave': return '🦁';
      default: return '🔲';
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-800 mb-2">窗口与浏览器选择</h3>
        <p className="text-sm text-gray-500">
          选择要捕获的浏览器标签页进行题目识别，即使在后台也能正常工作。
        </p>
      </div>

      {/* Scan + Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-medium text-gray-700">浏览器检测</h4>
            <p className="text-xs text-gray-400 mt-0.5">
              扫描已开启远程调试的 Chrome/Edge（端口 9222）
            </p>
          </div>
          <button
            onClick={handleScan}
            disabled={scanning}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              scanning
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {scanning ? '扫描中...' : '扫描浏览器'}
          </button>
        </div>

        {statusMsg && (
          <div className={`text-xs px-3 py-2 rounded ${
            statusMsg.includes('未发现') || statusMsg.includes('失败')
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {statusMsg}
          </div>
        )}

        {/* Browser list */}
        {browsers.length > 0 && (
          <div className="mt-3 space-y-2">
            {browsers.map((browser) => (
              <div key={browser.id} className="border border-gray-100 rounded-lg overflow-hidden">
                <button
                  onClick={() => handleListTabs(browser.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{browserTypeIcon(browser.type)}</span>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-700">{browser.name}</p>
                      <p className="text-xs text-gray-400">端口 {browser.debugPort}</p>
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      expandedBrowser === browser.id ? 'rotate-180' : ''
                    }`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Tab list */}
                {expandedBrowser === browser.id && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    {loadingTabs ? (
                      <div className="p-4 text-center text-sm text-gray-400">加载标签页中...</div>
                    ) : tabs.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-400">未发现打开的标签页</div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto">
                        {tabs.map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => handleSelectTab(tab)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 ${
                              selectedTab?.id === tab.id ? 'bg-blue-50 ring-1 ring-blue-200' : ''
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              selectedTab?.id === tab.id ? 'bg-blue-500' : 'bg-gray-300'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-700 truncate">{tab.title || '无标题'}</p>
                              <p className="text-xs text-gray-400 truncate">{tab.url}</p>
                            </div>
                            {selectedTab?.id === tab.id && (
                              <span className="text-xs text-blue-600 font-medium">当前</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!scanning && browsers.length === 0 && !statusMsg && (
          <div className="text-center py-6 text-sm text-gray-400 mt-3">
            点击「扫描浏览器」查找运行中的 Chrome/Edge 实例。
          </div>
        )}
      </div>

      {/* Current selection status */}
      {selectedTab && (
        <div className="bg-white rounded-lg border border-green-200 p-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-green-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">已选择</p>
              <p className="text-xs text-gray-500 truncate">
                {selectedTab.title} — {selectedTab.url}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chrome launch helper */}
      <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
        <h4 className="text-sm font-medium text-amber-800 mb-2">如何开启浏览器捕获</h4>
        <p className="text-xs text-amber-700 mb-3">
          标签页级捕获需要 Chrome/Edge 开启远程调试功能。
        </p>
        <div className="bg-amber-100/50 rounded p-3">
          <p className="text-xs font-mono text-amber-900 mb-2">
            关闭所有 Chrome 窗口后运行：
          </p>
          <code className="block text-xs bg-white rounded p-2 text-gray-800 break-all">
            "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
          </code>
          <p className="text-xs text-amber-700 mt-2">
            Microsoft Edge 请使用：<code className="bg-amber-100 px-1 rounded">msedge.exe --remote-debugging-port=9222</code>
          </p>
        </div>
      </div>
    </div>
  );
}
