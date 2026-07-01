import React, { useState, useEffect, useCallback } from 'react';

interface HistoryEntry {
  id: string; createdAt: number; answerSummary: string; answerFull: string;
  modelUsed: string; sourceType: string; sourceTitle?: string; sourceUrl?: string;
  latencyMs: number; status: string;
}

export function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const api = (window as any).adminAPI;

  const loadEntries = useCallback(async (p: number, query: string) => {
    setLoading(true);
    try {
      const result = query ? await api.searchHistory(query, p) : await api.listHistory({ page: p, pageSize: 20 });
      setEntries(result.items || []);
      setTotalPages(result.totalPages || 1);
      setPage(result.page || 1);
    } finally { setLoading(false); }
  }, [api]);

  useEffect(() => {
    const timer = setTimeout(() => loadEntries(1, searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, loadEntries]);

  const formatDate = (ts: number) => new Date(ts).toLocaleString('zh-CN');

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">历史记录</h3>
          <p className="text-sm text-gray-500">浏览和搜索历史 AI 回答。</p>
        </div>
        {entries.length > 0 && (
          <button onClick={async () => { if (confirm('确认清空全部历史记录？')) { await api.clearAllHistory(); loadEntries(1, searchQuery); } }}
            className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg">清空全部</button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-3 border-b border-gray-100">
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索历史记录..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400" />
        </div>
        {loading ? <div className="p-8 text-center text-sm text-gray-400">加载中...</div>
        : entries.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-sm text-gray-400">{searchQuery ? '未找到结果' : '暂无历史记录'}</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {entries.map((e) => (
                <div key={e.id} className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={async () => setSelectedEntry(await api.getHistoryDetail(e.id))}>
                  <p className="text-sm text-gray-700 line-clamp-2">{e.answerSummary || '（无内容）'}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-gray-400">{formatDate(e.createdAt)}</span>
                    <span className="text-xs text-gray-400">{e.modelUsed}</span>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 p-3 border-t">
                <button onClick={() => loadEntries(page - 1, searchQuery)} disabled={page <= 1}
                  className="px-3 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-30">上一页</button>
                <span className="text-xs text-gray-400">{page}/{totalPages}</span>
                <button onClick={() => loadEntries(page + 1, searchQuery)} disabled={page >= totalPages}
                  className="px-3 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-30">下一页</button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedEntry && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setSelectedEntry(null)}>
          <div className="bg-white rounded-xl shadow-xl w-[600px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h4 className="text-sm font-semibold">回答详情</h4>
              <button onClick={() => setSelectedEntry(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-xs text-gray-400 mb-3 space-y-1">
                <p>模型：{selectedEntry.modelUsed} | 来源：{selectedEntry.sourceType} | 延迟：{selectedEntry.latencyMs}ms</p>
                <p>时间：{formatDate(selectedEntry.createdAt)}</p>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedEntry.answerFull || selectedEntry.answerSummary}</div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button onClick={() => navigator.clipboard.writeText(selectedEntry.answerFull || selectedEntry.answerSummary)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">复制回答</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
