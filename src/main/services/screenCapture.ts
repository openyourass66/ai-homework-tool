import { desktopCapturer, screen } from 'electron';
import { browserConnector } from './browserConnector';
import { ImageProcessor } from './imageProcessor';
import type { CaptureResult } from '../../shared/types/ai';

const imageProcessor = new ImageProcessor();

export async function executeCapture(): Promise<CaptureResult> {
  const selectedTab = browserConnector.getSelectedTab();

  // Tier 1: CDP (preferred - can capture background tabs)
  if (selectedTab) {
    try {
      const result = await browserConnector.captureSelected();
      // Process image to reduce size
      const processed = await imageProcessor.prepareForAI(result.data);
      return {
        data: processed.data,
        timestamp: result.timestamp,
        sourceType: 'cdp',
        sourceUrl: result.sourceUrl,
        sourceTitle: result.sourceTitle,
      };
    } catch (err: any) {
      console.warn('CDP capture failed, falling back:', err.message);
    }
  }

  // Tier 2: Window capture via desktopCapturer
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    if (sources.length > 0) {
      // Try to find a browser window or use the first available
      const browserSource =
        sources.find(
          (s) =>
            s.name.includes('Chrome') ||
            s.name.includes('Edge') ||
            s.name.includes('Firefox') ||
            s.name.includes('Brave')
        ) || sources[0];

      const img = browserSource.thumbnail;
      const buffer = img.toJPEG(80);
      const processed = await imageProcessor.prepareForAI(buffer.toString('base64'));

      return {
        data: processed.data,
        timestamp: Date.now(),
        sourceType: 'window',
        sourceTitle: browserSource.name,
      };
    }
  } catch (err: any) {
    console.warn('Window capture failed, falling back:', err.message);
  }

  // Tier 3: Full screen capture
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: screen.getPrimaryDisplay().workAreaSize,
  });

  if (sources.length === 0) {
    throw new Error('No screen sources available');
  }

  const primaryScreen = sources[0];
  const buffer = primaryScreen.thumbnail.toJPEG(80);
  const processed = await imageProcessor.prepareForAI(buffer.toString('base64'));

  return {
    data: processed.data,
    timestamp: Date.now(),
    sourceType: 'screen',
  };
}
