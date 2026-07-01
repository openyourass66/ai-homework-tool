import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/ipcChannels';
import { aiService } from '../services/aiService';
import { storageService } from '../services/storageService';
import type { AIProvider } from '../../shared/types/ai';

export function registerAIHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.AI_ASK, async (_e, params: { imageBase64: string; question?: string }) => {
    try {
      const result = await aiService.askWithImage(params.imageBase64, params.question);

      storageService.addEntry({
        answerSummary: result.answer.substring(0, 500),
        answerFull: result.answer,
        modelUsed: result.modelUsed,
        providerName: '',
        sourceType: 'capture',
        latencyMs: result.latencyMs,
        status: 'success',
        tags: [],
        isPinned: false,
      });

      return result;
    } catch (err: any) {
      return {
        answer: 'Error: ' + err.message,
        modelUsed: 'error',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        latencyMs: 0,
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AI_LIST_PROVIDERS, async () => aiService.getProviders());

  ipcMain.handle(IPC_CHANNELS.AI_ADD_PROVIDER, async (_e, provider: AIProvider) => {
    aiService.addProvider(provider);
    const settings = storageService.getSettings();
    settings.providers = settings.providers.filter((p) => p.id !== provider.id);
    settings.providers.push(provider);
    storageService.saveSettings(settings);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.AI_UPDATE_PROVIDER, async (_e, id: string, updates: Partial<AIProvider>) => {
    const settings = storageService.getSettings();
    const idx = settings.providers.findIndex((p) => p.id === id);
    if (idx !== -1) {
      settings.providers[idx] = { ...settings.providers[idx], ...updates };
      aiService.addProvider(settings.providers[idx]);
      storageService.saveSettings(settings);
    }
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.AI_DELETE_PROVIDER, async (_e, id: string) => {
    aiService.removeProvider(id);
    const settings = storageService.getSettings();
    settings.providers = settings.providers.filter((p) => p.id !== id);
    if (settings.activeAIProvider === id) { settings.activeAIProvider = ''; settings.activeAIModel = ''; }
    storageService.saveSettings(settings);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.AI_TEST_CONNECTION, async (_e, providerId: string) => aiService.testConnection(providerId));

  ipcMain.handle(IPC_CHANNELS.AI_SET_ACTIVE_PROVIDER, async (_e, providerId: string, modelId: string) => {
    aiService.setActive(providerId, modelId);
    const settings = storageService.getSettings();
    settings.activeAIProvider = providerId;
    settings.activeAIModel = modelId;
    storageService.saveSettings(settings);
    return { success: true };
  });
}
