import sharp from 'sharp';
import { ImageFormatStrategy } from './ImageFormatStrategy';

export class WebpFormatStrategy implements ImageFormatStrategy {
  readonly supportedFormats = ['webp'];

  async encode(pipeline: sharp.Sharp): Promise<Buffer> {
    return await pipeline.webp().toBuffer();
  }

  getExtension(originalExtension: string): string {
    return originalExtension;
  }
}
