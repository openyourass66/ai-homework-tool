import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { AIConfigPage } from './components/models/AIConfigPage';
import { BrowserPage } from './components/browser/BrowserPage';
import { HistoryPage } from './components/history/HistoryPage';
import { SettingsPage } from './components/settings/SettingsPage';

type Page = 'ai-config' | 'browser' | 'history' | 'settings';

export function App() {
  const [currentPage, setCurrentPage] = useState<Page>('ai-config');

  const renderPage = () => {
    switch (currentPage) {
      case 'ai-config':
        return <AIConfigPage />;
      case 'browser':
        return <BrowserPage />;
      case 'history':
        return <HistoryPage />;
      case 'settings':
        return <SettingsPage />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentPage={currentPage} />
        <main className="flex-1 overflow-y-auto p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
