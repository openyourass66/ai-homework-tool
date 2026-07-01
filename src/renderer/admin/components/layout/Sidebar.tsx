import React from 'react';

type Page = 'ai-config' | 'browser' | 'history' | 'settings';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: 'ai-config', label: 'AI 模型配置', icon: '🤖' },
  { id: 'browser', label: '窗口选择', icon: '🖥' },
  { id: 'history', label: '历史记录', icon: '📋' },
  { id: 'settings', label: '系统设置', icon: '⚙' },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="h-14 flex items-center px-5 border-b border-gray-100">
        <h1 className="text-base font-bold text-gray-800">AI 屏幕助手</h1>
      </div>
      <nav className="flex-1 py-3">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
              currentPage === item.id
                ? 'bg-blue-50 text-blue-600 font-medium border-r-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={() => {
            (window as any).adminAPI?.launchFloatingWindow();
          }}
          className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          打开识别窗口
        </button>
      </div>
    </aside>
  );
}
