import { ImageFormatStrategy } from './ImageFormatStrategy';
import { JpegFormatStrategy } from './JpegFormatStrategy';
import { PngFormatStrategy } from './PngFormatStrategy';
import { WebpFormatStrategy } from './WebpFormatStrategy';
import { FallbackFormatStrategy } from './FallbackFormatStrategy';

export class ImageFormatRegistry {
  private readonly strategies: ImageFormatStrategy[];
  private readonly defaultStrategy: ImageFormatStrategy;

  constructor() {
    this.strategies = [
      new JpegFormatStrategy(),
      new PngFormatStrategy(),
      new WebpFormatStrategy(),
      new FallbackFormatStrategy(),
    ];

    // Default to JPEG for truly unknown formats
    this.defaultStrategy = new JpegFormatStrategy();
  }

  getStrategy(format: string): ImageFormatStrategy {
    const normalizedFormat = format.toLowerCase();

    // Find matching strategy
    for (const strategy of this.strategies) {
      if (strategy.supportedFormats.includes(normalizedFormat)) {
        return strategy;
      }
    }

    // Return default strategy for unknown formats
    return this.defaultStrategy;
  }
}
