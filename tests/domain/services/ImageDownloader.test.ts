import { IImageDownloader } from '../../../src/domain/services/IImageDownloader';

// Mock implementation for testing
class MockImageDownloader implements IImageDownloader {
  public downloadCalled = false;
  public lastUrl: string | null = null;
  public shouldFail = false;

  async downloadImage(url: string): Promise<{ buffer: Buffer; filename: string }> {
    this.downloadCalled = true;
    this.lastUrl = url;

    if (this.shouldFail) {
      throw new Error('Failed to download image from URL');
    }

    return {
      buffer: Buffer.from('fake-image-data'),
      filename: 'downloaded-image.jpg',
    };
  }

  isUrl(path: string): boolean {
    return path.startsWith('http://') || path.startsWith('https://');
  }

  reset(): void {
    this.downloadCalled = false;
    this.lastUrl = null;
    this.shouldFail = false;
  }
}

describe('IImageDownloader', () => {
  let downloader: MockImageDownloader;

  beforeEach(() => {
    downloader = new MockImageDownloader();
  });

  afterEach(() => {
    downloader.reset();
  });

  describe('isUrl', () => {
    it('should return true for http URLs', () => {
      expect(downloader.isUrl('http://example.com/image.jpg')).toBe(true);
    });

    it('should return true for https URLs', () => {
      expect(downloader.isUrl('https://example.com/image.jpg')).toBe(true);
    });

    it('should return false for local paths', () => {
      expect(downloader.isUrl('/input/image.jpg')).toBe(false);
    });

    it('should return false for relative paths', () => {
      expect(downloader.isUrl('./input/image.jpg')).toBe(false);
    });

    it('should return false for Windows paths', () => {
      expect(downloader.isUrl('C:\\Users\\test\\image.jpg')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(downloader.isUrl('')).toBe(false);
    });
  });

  describe('downloadImage', () => {
    it('should download image from URL', async () => {
      const url = 'https://example.com/test.jpg';
      const result = await downloader.downloadImage(url);

      expect(downloader.downloadCalled).toBe(true);
      expect(downloader.lastUrl).toBe(url);
      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toBeDefined();
    });

    it('should return buffer and filename after download', async () => {
      const url = 'https://example.com/test.jpg';
      const result = await downloader.downloadImage(url);

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toBe('downloaded-image.jpg');
    });

    it('should throw error if download fails', async () => {
      downloader.shouldFail = true;
      const url = 'https://example.com/test.jpg';

      await expect(downloader.downloadImage(url)).rejects.toThrow(
        'Failed to download image from URL'
      );
    });

    it('should handle different image formats', async () => {
      const urls = [
        'https://example.com/image.jpg',
        'https://example.com/image.png',
        'https://example.com/image.gif',
        'https://example.com/image.webp',
      ];

      for (const url of urls) {
        const result = await downloader.downloadImage(url);
        expect(result.buffer).toBeDefined();
        expect(result.filename).toBeDefined();
      }
    });
  });
});
