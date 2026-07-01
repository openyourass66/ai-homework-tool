import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface AIProvider {
  id: string;
  name: string;
  type: string;
  apiKey: string;
  endpoint?: string;
  models: string[];
  defaultModel: string;
}

const PROVIDER_TYPES = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'google', label: 'Google Gemini' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'custom', label: '自定义（兼容 OpenAI）' },
];

const DEFAULT_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-4o-mini'],
  anthropic: ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5'],
  google: ['gemini-2.5-pro', 'gemini-2.5-flash'],
  azure: ['gpt-4o', 'gpt-4-turbo'],
  custom: [],
};

export function AIConfigPage() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeProviderId, setActiveProviderId] = useState('');
  const [activeModelId, setActiveModelId] = useState('');
  const [testResult, setTestResult] = useState<Record<string, any>>({});
  const [testingId, setTestingId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({ name: '', type: 'openai', apiKey: '', endpoint: '', models: '', defaultModel: '' });

  const api = (window as any).adminAPI;

  const loadProviders = useCallback(async () => {
    const list = await api.listProviders();
    setProviders(list || []);
    const settings = await api.getSettings();
    setActiveProviderId(settings?.activeAIProvider || '');
    setActiveModelId(settings?.activeAIModel || '');
  }, [api]);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  const openAddForm = () => {
    setForm({ name: '', type: 'openai', apiKey: '', endpoint: '', models: '', defaultModel: '' });
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (p: AIProvider) => {
    setForm({ name: p.name, type: p.type, apiKey: p.apiKey, endpoint: p.endpoint || '', models: p.models.join(', '), defaultModel: p.defaultModel });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    const models = form.models.split(',').map((m) => m.trim()).filter(Boolean);
    const provider: AIProvider = {
      id: editingId || uuidv4(),
      name: form.name || form.type,
      type: form.type,
      apiKey: form.apiKey,
      endpoint: form.endpoint || undefined,
      models: models.length > 0 ? models : DEFAULT_MODELS[form.type] || [],
      defaultModel: form.defaultModel || (models[0] || DEFAULT_MODELS[form.type]?.[0] || ''),
    };
    await api.addProvider(provider);
    setShowForm(false);
    loadProviders();
  };

  const handleDelete = async (id: string) => {
    await api.deleteProvider(id);
    loadProviders();
  };

  const handleTest = async (providerId: string) => {
    setTestingId(providerId);
    const result = await api.testConnection(providerId);
    setTestResult((prev) => ({ ...prev, [providerId]: result }));
    setTestingId(null);
  };

  const handleSetActive = async (providerId: string, modelId: string) => {
    await api.setActiveProvider(providerId, modelId);
    setActiveProviderId(providerId);
    setActiveModelId(modelId);
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">AI 模型配置</h3>
          <p className="text-sm text-gray-500">配置 AI 服务商以支持题目识别和解答。</p>
        </div>
        <button onClick={openAddForm} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          添加服务商
        </button>
      </div>

      {/* Provider cards */}
      {providers.length === 0 && !showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          <div className="text-4xl mb-3">🔌</div>
          <p className="text-sm text-gray-400">尚未配置服务商，请添加一个开始使用。</p>
        </div>
      )}

      <div className="space-y-3">
        {providers.map((p) => (
          <div key={p.id} className={`bg-white rounded-lg border p-4 ${activeProviderId === p.id ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${activeProviderId === p.id ? 'bg-green-400' : 'bg-gray-300'}`} />
                <div>
                  <h4 className="text-sm font-medium text-gray-700">{p.name}</h4>
                  <span className="text-xs text-gray-400 uppercase">{p.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {testResult[p.id] && (
                  <span className={`text-xs px-2 py-0.5 rounded ${testResult[p.id].success ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {testResult[p.id].success ? `成功 (${testResult[p.id].latencyMs}ms)` : '失败'}
                  </span>
                )}
                <button onClick={() => handleTest(p.id)} disabled={testingId === p.id} className="text-xs px-2 py-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                  {testingId === p.id ? '测试中...' : '测试'}
                </button>
                <button onClick={() => openEditForm(p)} className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">编辑</button>
                <button onClick={() => handleDelete(p.id)} className="text-xs px-2 py-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">删除</button>
              </div>
            </div>

            {/* Model selection */}
            <div className="flex flex-wrap gap-2">
              {p.models.map((model) => (
                <button
                  key={model}
                  onClick={() => handleSetActive(p.id, model)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    activeProviderId === p.id && activeModelId === model
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {model}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-96 p-6">
            <h4 className="text-sm font-semibold text-gray-800 mb-4">{editingId ? '编辑服务商' : '添加服务商'}</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">名称</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="我的服务商" className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500">类型</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm border rounded-lg">
                  {PROVIDER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">API 密钥</label>
                <input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="sk-..." className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-blue-400" />
              </div>
              {(form.type === 'custom' || form.type === 'azure') && (
                <div>
                  <label className="text-xs text-gray-500">接口地址</label>
                  <input value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} placeholder="https://api.openai.com/v1" className="w-full mt-1 px-3 py-2 text-sm border rounded-lg" />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500">模型列表（逗号分隔）</label>
                <input value={form.models} onChange={(e) => setForm({ ...form, models: e.target.value })} placeholder="gpt-4o, gpt-4-turbo" className="w-full mt-1 px-3 py-2 text-sm border rounded-lg" />
              </div>
              <div>
                <label className="text-xs text-gray-500">默认模型</label>
                <input value={form.defaultModel} onChange={(e) => setForm({ ...form, defaultModel: e.target.value })} placeholder="gpt-4o" className="w-full mt-1 px-3 py-2 text-sm border rounded-lg" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">保存</button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
        <h4 className="text-sm font-medium text-blue-800 mb-2">支持的服务商</h4>
        <ul className="text-xs text-blue-600 space-y-1">
          <li>OpenAI（GPT-4o、GPT-4 Turbo、GPT-4o-mini）</li>
          <li>Anthropic Claude（Opus 4.7、Sonnet 4.6、Haiku 4.5）</li>
          <li>Google Gemini（2.5 Pro、2.5 Flash）</li>
          <li>兼容 OpenAI 接口（Ollama、DeepSeek、Groq、LM Studio）</li>
        </ul>
      </div>
    </div>
  );
}
