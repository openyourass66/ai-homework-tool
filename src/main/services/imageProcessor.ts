import sharp from 'sharp';

export class ImageProcessor {
  async prepareForAI(
    base64Image: string,
    targetMaxBytes: number = 1_000_000
  ): Promise<{ data: string; mimeType: string }> {
    const buffer = Buffer.from(base64Image, 'base64');
    const metadata = await sharp(buffer).metadata();

    let processed = sharp(buffer);

    // Resize if too large
    const maxDim = 2048;
    if ((metadata.width || 0) > maxDim || (metadata.height || 0) > maxDim) {
      processed = processed.resize(maxDim, maxDim, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Compress to JPEG with quality loop
    let quality = 85;
    let outputBuffer: Buffer;
    do {
      outputBuffer = await processed.jpeg({ quality }).toBuffer();
      quality -= 5;
    } while (outputBuffer.length > targetMaxBytes && quality > 30);

    return {
      data: outputBuffer.toString('base64'),
      mimeType: 'image/jpeg',
    };
  }

  async toJpegBuffer(base64Image: string, quality: number = 80): Promise<Buffer> {
    return sharp(Buffer.from(base64Image, 'base64'))
      .jpeg({ quality })
      .toBuffer();
  }
}
