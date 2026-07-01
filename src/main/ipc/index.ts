import { registerWindowHandlers } from './windowHandlers';
import { registerCaptureHandlers } from './captureHandlers';
import { registerAIHandlers } from './aiHandlers';
import { registerSettingsHandlers } from './settingsHandlers';
import { registerHistoryHandlers } from './historyHandlers';

export function registerAllHandlers(): void {
  registerWindowHandlers();
  registerCaptureHandlers();
  registerAIHandlers();
  registerSettingsHandlers();
  registerHistoryHandlers();
}
