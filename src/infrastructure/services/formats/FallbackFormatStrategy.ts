import sharp from 'sharp';
import { ImageFormatStrategy } from './ImageFormatStrategy';

/**
 * Fallback strategy for unsupported formats (AVIF, HEIF, etc.)
 * Converts to JPEG for maximum compatibility
 */
export class FallbackFormatStrategy implements ImageFormatStrategy {
  readonly supportedFormats = ['avif', 'heif'];

  async encode(pipeline: sharp.Sharp): Promise<Buffer> {
    return await pipeline.jpeg().toBuffer();
  }

  getExtension(_originalExtension: string): string {
    return '.jpg';
  }
}
