import React, { useState, useCallback, useEffect } from 'react';

type Status = 'idle' | 'capturing' | 'analyzing';

export function FloatingApp() {
  const [status, setStatus] = useState<Status>('idle');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [sourceInfo, setSourceInfo] = useState('');
  const [hasProvider, setHasProvider] = useState(false);

  const api = (window as any).floatingAPI;

  useEffect(() => {
    // Check if AI provider is configured
    api.getSettings().then((s: any) => {
      setHasProvider(!!(s?.activeAIProvider && s?.activeAIModel));
    });
    // Listen for global hotkey
    api.onGlobalHotkey(() => handleCapture());
  }, []);

  const handleCapture = useCallback(async () => {
    if (!api) return;
    setAnswer('');
    setError('');
    setStatus('capturing');

    try {
      // Step 1: Capture
      const captureResult = await api.executeCapture();
      if (captureResult?.error) {
        throw new Error(captureResult.error);
      }
      if (!captureResult?.data) {
        throw new Error('截图失败，未返回图片数据。请确保已选择浏览器标签页或尝试其他捕获方式。');
      }

      setSourceInfo(
        captureResult.sourceType === 'cdp'
          ? `截图来源：${captureResult.sourceTitle || '浏览器标签页'}`
          : `截图方式：${captureResult.sourceType}`
      );

      setStatus('analyzing');

      // Step 2: AI ask
      const aiResult = await api.aiAsk({ imageBase64: captureResult.data });

      setAnswer(aiResult.answer || '未获取到回答。');
      setStatus('idle');
    } catch (err: any) {
      setError(err.message || '未知错误');
      setStatus('idle');
    }
  }, [api]);

  const statusText: Record<Status, string> = {
    idle: '就绪',
    capturing: '截图中...',
    analyzing: 'AI 思考中...',
  };

  const statusColors: Record<Status, string> = {
    idle: 'bg-green-400 shadow-green-400/30',
    capturing: 'bg-yellow-400 shadow-yellow-400/30 animate-pulse',
    analyzing: 'bg-blue-400 shadow-blue-400/30 animate-pulse',
  };

  return (
    <div className="floating-window">
      {/* Title bar */}
      <div className="drag-handle">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shadow-sm ${statusColors[status]}`} />
          <span className="text-xs text-white/50 font-medium select-none">AI 助手</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => api?.closeWindow()}
            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col p-3 overflow-hidden">
        {/* Idle state */}
        {status === 'idle' && !answer && !error && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-4xl mb-3 opacity-80">🎯</div>
            <p className="text-white/40 text-xs mb-1">
              {hasProvider ? '点击捕获或按 Ctrl+Shift+Q' : '请先在设置中配置 AI 模型'}
            </p>
            {sourceInfo && <p className="text-white/20 text-xs mt-1">{sourceInfo}</p>}
          </div>
        )}

        {/* Loading */}
        {status !== 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="loading-spinner" />
            <p className="text-white/50 text-xs">{statusText[status]}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="w-full bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-2">
            <p className="text-red-300 text-xs leading-relaxed">{error}</p>
          </div>
        )}

        {/* Answer */}
        {answer && status === 'idle' && (
          <div className="flex-1 overflow-y-auto answer-content">
            <div className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap">
              {answer}
            </div>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="action-bar">
        {sourceInfo && status === 'idle' && answer && (
          <p className="text-white/25 text-xs truncate max-w-[200px] mr-2">{sourceInfo}</p>
        )}
        <button
          onClick={handleCapture}
          disabled={status !== 'idle'}
          className={`capture-btn ${status !== 'idle' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/[0.08]'}`}
        >
          <span className="text-base">
            {status === 'capturing' ? '📷' : status === 'analyzing' ? '🤖' : '📸'}
          </span>
          <span className="text-xs font-medium text-white/70">
            {status === 'idle' ? (answer ? '再次提问' : '捕获并提问') : statusText[status]}
          </span>
        </button>
        {answer && status === 'idle' && (
          <button
            onClick={() => navigator.clipboard.writeText(answer)}
            className="ml-2 px-3 py-1.5 text-xs text-white/40 hover:text-white/70 hover:bg-white/5 rounded-lg transition-colors"
            title="复制回答"
          >
            📋
          </button>
        )}
      </div>
    </div>
  );
}
