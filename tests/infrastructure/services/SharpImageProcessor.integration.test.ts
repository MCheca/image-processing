import { SharpImageProcessor } from '../../../src/infrastructure/services/SharpImageProcessor';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import * as crypto from 'crypto';

describe('SharpImageProcessor - Integration Tests', () => {
  let processor: SharpImageProcessor;
  const testOutputDir = path.join(__dirname, '../../fixtures/output');
  const testInputDir = path.join(__dirname, '../../fixtures/input');

  // Track all created files and directories for cleanup
  const createdPaths = new Set<string>();

  // Helper function to create test images
  const createTestImage = async (
    filename: string,
    width: number,
    height: number,
    background: { r: number; g: number; b: number; alpha?: number },
    format: 'jpeg' | 'png' | 'webp' | 'avif' = 'jpeg'
  ): Promise<void> => {
    const channels = background.alpha !== undefined ? 4 : 3;
    const imagePath = path.join(testInputDir, filename);

    const image = sharp({
      create: {
        width,
        height,
        channels,
        background,
      },
    });

    // Apply format
    switch (format) {
      case 'jpeg':
        await image.jpeg().toFile(imagePath);
        break;
      case 'png':
        await image.png().toFile(imagePath);
        break;
      case 'webp':
        await image.webp().toFile(imagePath);
        break;
    }

    // Track created file
    createdPaths.add(imagePath);
  };

  beforeAll(async () => {
    processor = new SharpImageProcessor();

    // Clean up any leftover files from previous test runs
    try {
      await fs.rm(testInputDir, { recursive: true, force: true });
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    // Wait a bit for file system to release locks
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create test directories and track them
    await fs.mkdir(testInputDir, { recursive: true });
    await fs.mkdir(testOutputDir, { recursive: true });
    createdPaths.add(testInputDir);
    createdPaths.add(testOutputDir);

    // Create all test images (they will be tracked automatically by createTestImage)
    await Promise.all([
      // Standard test images
      createTestImage('test-image.jpg', 1600, 1200, { r: 255, g: 0, b: 0 }, 'jpeg'),
      createTestImage('wide-image.jpg', 2000, 1000, { r: 0, g: 255, b: 0 }, 'jpeg'),
      createTestImage('tall-image.jpg', 1000, 2000, { r: 0, g: 0, b: 255 }, 'jpeg'),
      createTestImage('test-image.png', 1600, 1200, { r: 255, g: 255, b: 0, alpha: 1 }, 'png'),

      // Special filename tests
      createTestImage('test image-2024_final.jpg', 1600, 1200, { r: 255, g: 0, b: 0 }, 'jpeg'),
      createTestImage('图片-фото-صورة-画像.jpg', 1600, 1200, { r: 128, g: 128, b: 255 }, 'jpeg'),

      // Modern formats
      createTestImage('test-image.webp', 1600, 1200, { r: 255, g: 128, b: 0 }, 'webp'),
      createTestImage('multi-res.webp', 2000, 1500, { r: 200, g: 100, b: 50 }, 'webp'),
    ]);
  });

  afterAll(async () => {
    // Sharp uses libvips which caches image data and file handles for performance
    // We must explicitly clear this cache before cleanup, especially for WebP files
    sharp.cache(false);

    // Clean up all tracked paths with robust retry logic for Windows file locks
    const cleanupPath = async (targetPath: string, maxRetries = 5): Promise<void> => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const stat = await fs.stat(targetPath).catch(() => null);
          if (!stat) {
            // Path doesn't exist, nothing to clean
            return;
          }

          // Remove the path with built-in retry support
          // Combines fs.rm retries with our own retry loop for stubborn Windows locks
          await fs.rm(targetPath, {
            recursive: true,
            force: true,
            maxRetries: 3,
            retryDelay: 100
          });
          return; // Success!
        } catch (error) {
          const isLastAttempt = attempt === maxRetries - 1;

          if (isLastAttempt) {
            // Log warning but don't fail tests - some files may be locked by antivirus/indexing
            console.warn(`Unable to cleanup ${path.basename(targetPath)} after ${maxRetries} attempts`);
            return;
          }

          // Exponential backoff for Windows file locks: 100ms, 200ms, 400ms, 800ms
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
        }
      }
    };

    // Sort paths by depth (deepest first) to clean up in correct order
    const pathsArray = Array.from(createdPaths).sort((a, b) => {
      const depthA = a.split(path.sep).length;
      const depthB = b.split(path.sep).length;
      return depthB - depthA; // Descending order
    });

    // Clean up all tracked paths
    for (const targetPath of pathsArray) {
      await cleanupPath(targetPath);
    }

    // Clean up parent fixtures directory if it exists and is empty
    const fixturesDir = path.join(__dirname, '../../fixtures');
    try {
      const entries = await fs.readdir(fixturesDir).catch(() => []);
      if (entries.length === 0) {
        await fs.rm(fixturesDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore errors - directory might not exist or might have other contents
    }

    // Clear the tracking set
    createdPaths.clear();
  }, 15000); // 15 second timeout for cleanup

  afterEach(async () => {
    // Clean up output directory content after each test (but keep the directory itself)
    // Using fs.rm with retry options handles any transient file locks
    try {
      const entries = await fs.readdir(testOutputDir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        const fullPath = path.join(testOutputDir, entry.name);
        try {
          await fs.rm(fullPath, {
            recursive: true,
            force: true,
            maxRetries: 2,
            retryDelay: 50
          });
        } catch {
          // If a file is still locked, it will be cleaned up in afterAll
        }
      }
    } catch {
      // Directory might not exist yet, ignore
    }
  });

  describe('processImage', () => {
    it('should process image to 1024px and 800px resolutions', async () => {
      const sourcePath = path.join(testInputDir, 'test-image.jpg');
      const resolutions = [1024, 800];

      const results = await processor.processImage(sourcePath, testOutputDir, resolutions);

      expect(results).toBeDefined();
      expect(results).toHaveLength(2);

      // Verify 1024px variant
      expect(results[0].resolution).toBe('1024');
      expect(results[0].path).toContain('/1024/');
      expect(results[0].path).toContain('.jpg');

      // Verify 800px variant
      expect(results[1].resolution).toBe('800');
      expect(results[1].path).toContain('/800/');
      expect(results[1].path).toContain('.jpg');
    });

    it('should maintain aspect ratio when resizing', async () => {
      const sourcePath = path.join(testInputDir, 'test-image.jpg');
      const resolutions = [1024, 800];

      const results = await processor.processImage(sourcePath, testOutputDir, resolutions);

      for (const result of results) {
        const fullPath = path.join(testOutputDir, result.path);
        const metadata = await sharp(fullPath).metadata();

        const expectedWidth = parseInt(result.resolution);
        const expectedHeight = Math.round(expectedWidth * (1200 / 1600)); // Original aspect ratio

        expect(metadata.width).toBe(expectedWidth);
        expect(metadata.height).toBe(expectedHeight);
      }
    });

    it('should handle wide images (landscape)', async () => {
      const sourcePath = path.join(testInputDir, 'wide-image.jpg');
      const resolutions = [1024];

      const results = await processor.processImage(sourcePath, testOutputDir, resolutions);

      const fullPath = path.join(testOutputDir, results[0].path);
      const metadata = await sharp(fullPath).metadata();

      expect(metadata.width).toBe(1024);
      expect(metadata.height).toBe(512); // 1024 * (1000/2000)
    });

    it('should handle tall images (portrait)', async () => {
      const sourcePath = path.join(testInputDir, 'tall-image.jpg');
      const resolutions = [800];

      const results = await processor.processImage(sourcePath, testOutputDir, resolutions);

      const fullPath = path.join(testOutputDir, results[0].path);
      const metadata = await sharp(fullPath).metadata();

      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(1600); // 800 * (2000/1000)
    });

    it('should generate correct MD5 hashes for processed images', async () => {
      const sourcePath = path.join(testInputDir, 'test-image.jpg');
      const resolutions = [1024];

      const results = await processor.processImage(sourcePath, testOutputDir, resolutions);

      const result = results[0];
      const fullPath = path.join(testOutputDir, result.path);
      const fileBuffer = await fs.readFile(fullPath);
      const actualMd5 = crypto.createHash('md5').update(fileBuffer).digest('hex');

      // MD5 should be in the path
      expect(result.path).toContain(actualMd5);
    });

    it('should save to correct output path format: /output/{original_name}/{resolution}/{md5}.{ext}', async () => {
      const sourcePath = path.join(testInputDir, 'test-image.jpg');
      const resolutions = [1024, 800];

      const results = await processor.processImage(sourcePath, testOutputDir, resolutions);

      for (const result of results) {
        // Path should follow the format: /test-image/1024/{md5}.jpg
        const pathParts = result.path.split(/[/\\]/);

        expect(pathParts).toContain('test-image'); // Original name (without extension)
        expect(pathParts).toContain(result.resolution); // Resolution folder

        const fileName = pathParts[pathParts.length - 1];
        expect(fileName).toMatch(/^[a-f0-9]{32}\.jpg$/); // MD5 hash + extension
      }
    });

    it('should preserve file extension (jpg)', async () => {
      const sourcePath = path.join(testInputDir, 'test-image.jpg');
      const resolutions = [1024];

      const results = await processor.processImage(sourcePath, testOutputDir, resolutions);

      expect(results[0].path).toMatch(/\.jpg$/);
    });

    it('should handle PNG images and preserve format', async () => {
      const sourcePath = path.join(testInputDir, 'test-image.png');
      const resolutions = [1024];

      const results = await processor.processImage(sourcePath, testOutputDir, resolutions);

      expect(results[0].path).toMatch(/\.png$/);

      const fullPath = path.join(testOutputDir, results[0].path);
      const metadata = await sharp(fullPath).metadata();
      expect(metadata.format).toBe('png');
    });

    it('should create output directories if they do not exist', async () => {
      const sourcePath = path.join(testInputDir, 'test-image.jpg');
      const nonExistentDir = path.join(testOutputDir, 'new-dir');
      const resolutions = [1024];

      const results = await processor.processImage(sourcePath, nonExistentDir, resolutions);

      const fullPath = path.join(nonExistentDir, results[0].path);
      const fileExists = await fs.access(fullPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Track for cleanup (will be cleaned up in afterEach since it's under testOutputDir)
      createdPaths.add(nonExistentDir);
    });

    it('should process multiple resolutions in correct order', async () => {
      const sourcePath = path.join(testInputDir, 'test-image.jpg');
      const resolutions = [1024, 800, 600];

      const results = await processor.processImage(sourcePath, testOutputDir, resolutions);

      expect(results).toHaveLength(3);
      expect(results[0].resolution).toBe('1024');
      expect(results[1].resolution).toBe('800');
      expect(results[2].resolution).toBe('600');
    });

    it('should generate unique MD5 hashes for different resolutions', async () => {
      const sourcePath = path.join(testInputDir, 'test-image.jpg');
      const resolutions = [1024, 800];

      const results = await processor.processImage(sourcePath, testOutputDir, resolutions);

      const md5Hashes = results.map(r => {
        const fileName = r.path.split(/[/\\]/).pop()!;
        return fileName.split('.')[0]; // Extract MD5 from filename
      });

      // MD5 hashes should be different for different resolutions
      expect(md5Hashes[0]).not.toBe(md5Hashes[1]);
      expect(md5Hashes[0]).toMatch(/^[a-f0-9]{32}$/);
      expect(md5Hashes[1]).toMatch(/^[a-f0-9]{32}$/);
    });
  });

  describe('error handling', () => {
    it('should throw error when source file does not exist', async () => {
      const nonExistentPath = path.join(testInputDir, 'non-existent.jpg');
      const resolutions = [1024];

      await expect(
        processor.processImage(nonExistentPath, testOutputDir, resolutions)
      ).rejects.toThrow();
    });

    it('should throw error when source path is invalid', async () => {
      const invalidPath = '';
      const resolutions = [1024];

      await expect(
        processor.processImage(invalidPath, testOutputDir, resolutions)
      ).rejects.toThrow();
    });

    it('should throw error when resolutions array is empty', async () => {
      const sourcePath = path.join(testInputDir, 'test-image.jpg');
      const resolutions: number[] = [];

      await expect(
        processor.processImage(sourcePath, testOutputDir, resolutions)
      ).rejects.toThrow();
    });

    it('should throw error for invalid resolution values', async () => {
      const sourcePath = path.join(testInputDir, 'test-image.jpg');
      const resolutions = [0];

      await expect(
        processor.processImage(sourcePath, testOutputDir, resolutions)
      ).rejects.toThrow();
    });

    it('should throw error for negative resolution values', async () => {
      const sourcePath = path.join(testInputDir, 'test-image.jpg');
      const resolutions = [-100];

      await expect(
        processor.processImage(sourcePath, testOutputDir, resolutions)
      ).rejects.toThrow();
    });

    it('should throw error when trying to process non-image file', async () => {
      const textFilePath = path.join(testInputDir, 'not-an-image.txt');
      await fs.writeFile(textFilePath, 'This is not an image');
      createdPaths.add(textFilePath); // Track for cleanup
      const resolutions = [1024];

      await expect(
        processor.processImage(textFilePath, testOutputDir, resolutions)
      ).rejects.toThrow();
    });
  });  describe('file system operations', () => {
    it('should write files that can be read back', async () => {
      const sourcePath = path.join(testInputDir, 'test-image.jpg');
      const resolutions = [1024];

      const results = await processor.processImage(sourcePath, testOutputDir, resolutions);

      const fullPath = path.join(testOutputDir, results[0].path);
      const fileBuffer = await fs.readFile(fullPath);
      expect(fileBuffer.length).toBeGreaterThan(0);

      // Verify it's a valid JPEG
      const metadata = await sharp(fileBuffer).metadata();
      expect(metadata.format).toBe('jpeg');
    });

    it('should handle path with special characters in original filename', async () => {
      const specialPath = path.join(testInputDir, 'test image-2024_final.jpg');
      const resolutions = [1024];

      const results = await processor.processImage(specialPath, testOutputDir, resolutions);

      expect(results[0].path).toBeDefined();
      const fullPath = path.join(testOutputDir, results[0].path);
      const fileExists = await fs.access(fullPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should handle Unicode filenames (international characters)', async () => {
      const unicodePath = path.join(testInputDir, '图片-фото-صورة-画像.jpg');
      const resolutions = [1024];

      const results = await processor.processImage(unicodePath, testOutputDir, resolutions);

      expect(results[0].path).toBeDefined();
      const fullPath = path.join(testOutputDir, results[0].path);
      const fileExists = await fs.access(fullPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Verify the file is a valid image
      const metadata = await sharp(fullPath).metadata();
      expect(metadata.width).toBe(1024);
    });
  });

  describe('modern image formats', () => {
    it('should handle WEBP images and preserve format', async () => {
      const webpPath = path.join(testInputDir, 'test-image.webp');
      const resolutions = [1024];

      const results = await processor.processImage(webpPath, testOutputDir, resolutions);

      expect(results[0].path).toMatch(/\.webp$/);

      const fullPath = path.join(testOutputDir, results[0].path);
      const metadata = await sharp(fullPath).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBe(1024);
    });

    it('should process WEBP with multiple resolutions', async () => {
      const webpPath = path.join(testInputDir, 'multi-res.webp');
      const resolutions = [1024, 800];

      const results = await processor.processImage(webpPath, testOutputDir, resolutions);

      expect(results).toHaveLength(2);

      for (const result of results) {
        expect(result.path).toMatch(/\.webp$/);
        const fullPath = path.join(testOutputDir, result.path);
        const metadata = await sharp(fullPath).metadata();
        expect(metadata.format).toBe('webp');
      }
    });
  });
});
