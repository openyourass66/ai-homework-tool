import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { ImageProcessor } from './imageProcessor';
import type { AIProvider, VisionChatRequest, VisionChatResponse } from '../../shared/types/ai';

const imageProcessor = new ImageProcessor();

interface AIProviderAdapter {
  readonly providerType: string;
  chatWithVision(req: VisionChatRequest): Promise<VisionChatResponse>;
  listModels(): Promise<string[]>;
  testConnection(): Promise<{ valid: boolean; error?: string }>;
}

class OpenAIAdapter implements AIProviderAdapter {
  readonly providerType: string;
  private client: OpenAI;

  constructor(private config: AIProvider) {
    this.providerType = config.type;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.endpoint || 'https://api.openai.com/v1',
    });
  }

  async chatWithVision(req: VisionChatRequest): Promise<VisionChatResponse> {
    const start = Date.now();
    const response = await this.client.chat.completions.create({
      model: req.modelId,
      max_tokens: req.maxTokens || 2048,
      temperature: req.temperature ?? 0.3,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: req.systemPrompt + (req.userQuestion ? `\n\nUser question: ${req.userQuestion}` : '') },
            { type: 'image_url', image_url: { url: `data:${req.imageMimeType};base64,${req.imageBase64}` } },
          ],
        },
      ],
    });
    return {
      answer: response.choices[0].message.content || '',
      modelUsed: response.model,
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
      latencyMs: Date.now() - start,
    };
  }

  async listModels(): Promise<string[]> {
    try {
      const resp = await this.client.models.list();
      return resp.data.map((m: any) => m.id).filter((id: string) =>
        id.includes('gpt') || id.includes('o1') || id.includes('o3') || id.includes('claude')
      );
    } catch {
      return this.config.models;
    }
  }

  async testConnection(): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.client.models.list();
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }
}

class AnthropicAdapter implements AIProviderAdapter {
  readonly providerType = 'anthropic';
  private client: Anthropic;

  constructor(private config: AIProvider) {
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  async chatWithVision(req: VisionChatRequest): Promise<VisionChatResponse> {
    const start = Date.now();
    const response = await this.client.messages.create({
      model: req.modelId,
      max_tokens: req.maxTokens || 2048,
      system: req.systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: req.imageMimeType as 'image/jpeg' | 'image/png',
                data: req.imageBase64,
              },
            },
            { type: 'text', text: req.userQuestion || 'Analyze this screenshot and identify any questions. Provide answer and explanation in Chinese.' },
          ],
        },
      ],
    });
    const textBlocks = response.content.filter((c: any) => c.type === 'text');
    return {
      answer: textBlocks.map((c: any) => c.text).join('\n'),
      modelUsed: response.model,
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      latencyMs: Date.now() - start,
    };
  }

  async listModels(): Promise<string[]> {
    return this.config.models;
  }

  async testConnection(): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.client.messages.create({
        model: this.config.defaultModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }
}

class AIService {
  private adapters = new Map<string, AIProviderAdapter>();
  private providers: AIProvider[] = [];
  private activeProviderId = '';
  private activeModelId = '';

  addProvider(provider: AIProvider): void {
    this.providers = this.providers.filter((p) => p.id !== provider.id);
    this.providers.push(provider);

    switch (provider.type) {
      case 'openai':
        this.adapters.set(provider.id, new OpenAIAdapter(provider));
        break;
      case 'anthropic':
        this.adapters.set(provider.id, new AnthropicAdapter(provider));
        break;
      case 'google':
        this.adapters.set(provider.id, new OpenAIAdapter(provider)); // Gemini via OpenAI-compatible endpoint
        break;
      case 'azure':
      case 'custom':
        this.adapters.set(provider.id, new OpenAIAdapter(provider));
        break;
    }
  }

  removeProvider(id: string): void {
    this.providers = this.providers.filter((p) => p.id !== id);
    this.adapters.delete(id);
  }

  setActive(providerId: string, modelId: string): void {
    this.activeProviderId = providerId;
    this.activeModelId = modelId;
  }

  getProviders(): AIProvider[] {
    return this.providers;
  }

  async askWithImage(imageBase64: string, question?: string): Promise<VisionChatResponse> {
    const adapter = this.adapters.get(this.activeProviderId);
    if (!adapter) throw new Error('No active AI provider configured. Please set up a model in Settings.');

    const provider = this.providers.find((p) => p.id === this.activeProviderId);
    const systemPrompt = provider ? question || '分析这张截图。识别其中的题目、问题或任务，给出答案和简短的解析。请用中文回答。' : question || '';

    const processed = await imageProcessor.prepareForAI(imageBase64);

    return adapter.chatWithVision({
      imageBase64: processed.data,
      imageMimeType: processed.mimeType,
      systemPrompt,
      userQuestion: question,
      modelId: this.activeModelId,
      maxTokens: 2048,
      temperature: 0.3,
    });
  }

  async testConnection(providerId: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const adapter = this.adapters.get(providerId);
    if (!adapter) return { success: false, latencyMs: 0, error: 'Provider not found' };
    const start = Date.now();
    const result = await adapter.testConnection();
    return { success: result.valid, latencyMs: Date.now() - start, error: result.error };
  }
}

export const aiService = new AIService();
