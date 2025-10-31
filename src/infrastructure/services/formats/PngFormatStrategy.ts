import sharp from 'sharp';
import { ImageFormatStrategy } from './ImageFormatStrategy';

export class PngFormatStrategy implements ImageFormatStrategy {
  readonly supportedFormats = ['png'];

  async encode(pipeline: sharp.Sharp): Promise<Buffer> {
    return await pipeline.png().toBuffer();
  }

  getExtension(originalExtension: string): string {
    return originalExtension;
  }
}
