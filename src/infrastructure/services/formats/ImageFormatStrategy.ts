import sharp from 'sharp';

export interface ImageFormatStrategy {
  readonly supportedFormats: string[];

  encode(pipeline: sharp.Sharp): Promise<Buffer>;

  getExtension(originalExtension: string): string;
}
