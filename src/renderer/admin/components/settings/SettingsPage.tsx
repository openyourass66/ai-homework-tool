import React, { useState, useEffect } from 'react';

export function SettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const api = (window as any).adminAPI;

  useEffect(() => {
    api.getSettings().then((s: any) => setSettings(s || {}));
  }, [api]);

  const update = async (key: string, value: any) => {
    await api.setSetting(key, value);
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-800 mb-1">系统设置</h3>
        <p className="text-sm text-gray-500">配置常规偏好、捕获方式和浮动窗口。</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h4 className="text-sm font-medium text-gray-700 mb-3">常规</h4>
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm text-gray-600">
              <input type="checkbox" className="rounded" checked={settings?.general?.launchOnStartup || false}
                onChange={(e) => update('general', { ...settings?.general, launchOnStartup: e.target.checked })} />
              开机自启动
            </label>
            <label className="flex items-center gap-3 text-sm text-gray-600">
              <input type="checkbox" className="rounded" checked={settings?.general?.minimizeToTray !== false}
                onChange={(e) => update('general', { ...settings?.general, minimizeToTray: e.target.checked })} />
              关闭时最小化到系统托盘
            </label>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">全局快捷键：</span>
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-700 border">
                {settings?.general?.globalHotkey || 'Ctrl+Shift+Q'}
              </kbd>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h4 className="text-sm font-medium text-gray-700 mb-3">捕获设置</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">默认方式：</span>
              <select value={settings?.capture?.method || 'cdp'} onChange={(e) => update('capture', { ...settings?.capture, method: e.target.value })}
                className="text-sm border rounded px-2 py-1">
                <option value="cdp">CDP（浏览器标签页）</option>
                <option value="window">窗口捕获</option>
                <option value="screen">屏幕捕获</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">JPEG 质量：</span>
              <span className="text-sm text-gray-800">{settings?.capture?.jpegQuality || 80}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">最大图片大小：</span>
              <span className="text-sm text-gray-800">{settings?.capture?.maxImageBytes ? `${(settings.capture.maxImageBytes / 1024 / 1024).toFixed(0)} MB` : '2 MB'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h4 className="text-sm font-medium text-gray-700 mb-3">浮动窗口</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">默认位置：</span>
              <select value={settings?.floatWindow?.position || 'top-right'} onChange={(e) => update('floatWindow', { ...settings?.floatWindow, position: e.target.value })}
                className="text-sm border rounded px-2 py-1">
                <option value="top-right">右上</option>
                <option value="bottom-right">右下</option>
                <option value="top-left">左上</option>
                <option value="bottom-left">左下</option>
              </select>
            </div>
            <label className="flex items-center gap-3 text-sm text-gray-600">
              <input type="checkbox" className="rounded" checked={settings?.floatWindow?.alwaysOnTop !== false}
                onChange={(e) => update('floatWindow', { ...settings?.floatWindow, alwaysOnTop: e.target.checked })} />
              窗口置顶
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
