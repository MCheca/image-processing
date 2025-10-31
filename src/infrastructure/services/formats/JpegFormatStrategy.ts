import sharp from 'sharp';
import { ImageFormatStrategy } from './ImageFormatStrategy';

export class JpegFormatStrategy implements ImageFormatStrategy {
  readonly supportedFormats = ['jpeg', 'jpg'];

  async encode(pipeline: sharp.Sharp): Promise<Buffer> {
    return await pipeline.jpeg().toBuffer();
  }

  getExtension(originalExtension: string): string {
    return originalExtension;
  }
}
