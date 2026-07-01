export type AIProviderType = 'openai' | 'anthropic' | 'google' | 'azure' | 'custom';

export interface AIProvider {
  id: string;
  name: string;
  type: AIProviderType;
  apiKey: string;
  endpoint?: string;
  models: string[];
  defaultModel: string;
}

export interface VisionChatRequest {
  imageBase64: string;
  imageMimeType: string;
  systemPrompt: string;
  userQuestion?: string;
  modelId: string;
  maxTokens?: number;
  temperature?: number;
}

export interface VisionChatResponse {
  answer: string;
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
}

export interface CaptureResult {
  data: string;
  width?: number;
  height?: number;
  timestamp: number;
  sourceType: 'cdp' | 'window' | 'screen' | 'screen-region';
  sourceUrl?: string;
  sourceTitle?: string;
}
