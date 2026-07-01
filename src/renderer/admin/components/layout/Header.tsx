import React from 'react';

type Page = 'ai-config' | 'browser' | 'history' | 'settings';

const pageTitles: Record<Page, string> = {
  'ai-config': 'AI 模型配置',
  'browser': '窗口与浏览器选择',
  'history': '历史记录',
  'settings': '系统设置',
};

export function Header({ currentPage }: { currentPage: Page }) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-gray-800">{pageTitles[currentPage]}</h2>
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-green-400" title="系统就绪" />
        <span className="text-xs text-gray-400">v1.0.0</span>
      </div>
    </header>
  );
}
