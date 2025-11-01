import { ImageProcessor } from '../../domain/services/ImageProcessor';
import { TaskImage } from '../../domain/entities/Task';
import sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { ImageFormatRegistry } from './formats/ImageFormatRegistry';

export class SharpImageProcessor implements ImageProcessor {
  private readonly formatRegistry = new ImageFormatRegistry();
  async processImage(
    source: string | Buffer,
    outputDir: string,
    resolutions: number[],
    originalFilename?: string
  ): Promise<TaskImage[]> {
    // Validate inputs
    this.validateInputs(source, resolutions);

    // Verify source file exists (only for string paths)
    if (typeof source === 'string') {
      await this.verifySourceExists(source);
    }

    // Get source image metadata
    const metadata = await this.getImageMetadata(source);

    // Extract original filename and extension
    const { originalName, extension } = this.parseFileName(source, originalFilename);

    // Process each resolution
    const results: TaskImage[] = [];

    for (const resolution of resolutions) {
      const processedImage = await this.processResolution(
        source,
        outputDir,
        originalName,
        extension,
        resolution,
        metadata
      );
      results.push(processedImage);
    }

    return results;
  }

  private validateInputs(source: string | Buffer, resolutions: number[]): void {
    if (typeof source === 'string' && (!source || source.trim() === '')) {
      throw new Error('Source path cannot be empty');
    }

    if (Buffer.isBuffer(source) && source.length === 0) {
      throw new Error('Source buffer cannot be empty');
    }

    if (!resolutions || resolutions.length === 0) {
      throw new Error('Resolutions array cannot be empty');
    }

    for (const resolution of resolutions) {
      if (resolution <= 0) {
        throw new Error(`Invalid resolution value: ${resolution}. Resolution must be greater than 0`);
      }
    }
  }

  private async verifySourceExists(sourcePath: string): Promise<void> {
    try {
      await fs.access(sourcePath);
    } catch (error) {
      throw new Error(`Source file does not exist: ${sourcePath}`);
    }
  }

  private async getImageMetadata(source: string | Buffer): Promise<sharp.Metadata> {
    try {
      return await sharp(source).metadata();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to read image metadata: ${error.message}`);
      }
      throw error;
    }
  }

  private parseFileName(
    source: string | Buffer,
    originalFilename?: string
  ): { originalName: string; extension: string } {
    // For Buffer, use provided filename or default
    if (Buffer.isBuffer(source)) {
      if (!originalFilename) {
        return {
          originalName: 'image',
          extension: '.jpg',
        };
      }
      const extName = path.extname(originalFilename);
      const nameWithoutExt = path.basename(originalFilename, extName);
      return {
        originalName: nameWithoutExt,
        extension: extName.toLowerCase() || '.jpg',
      };
    }

    // For string paths
    const fileName = path.basename(source);
    const extName = path.extname(fileName);
    const nameWithoutExt = path.basename(fileName, extName);

    return {
      originalName: nameWithoutExt,
      extension: extName.toLowerCase(),
    };
  }

  private async processResolution(
    source: string | Buffer,
    outputDir: string,
    originalName: string,
    extension: string,
    targetWidth: number,
    metadata: sharp.Metadata
  ): Promise<TaskImage> {
    // Calculate height maintaining aspect ratio
    const aspectRatio = metadata.height! / metadata.width!;
    const targetHeight = Math.round(targetWidth * aspectRatio);

    // Resize image
    let resizedBuffer: Buffer;
    let outputExtension = extension;
    try {
      const result = await this.resizeImage(
        source,
        targetWidth,
        targetHeight,
        metadata.format!,
        extension
      );
      resizedBuffer = result.buffer;
      outputExtension = result.extension;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to resize image: ${error.message}`);
      }
      throw error;
    }

    // Generate MD5 hash
    const md5Hash = this.generateMD5(resizedBuffer);

    // Build relative path from output dir: {originalName}/{resolution}/{md5}.{ext}
    // Use path.posix for forward slashes (cross-platform, URL-safe, database-friendly)
    const relativePath = path.posix.join(
      originalName,
      targetWidth.toString(),
      `${md5Hash}${outputExtension}`
    );

    // Build full file system path with OS-specific separators
    const fullOutputPath = path.join(outputDir, relativePath);

    // Create output directories
    await this.ensureDirectoryExists(path.dirname(fullOutputPath));

    // Write resized image to disk
    await fs.writeFile(fullOutputPath, resizedBuffer);

    // Build API path: /output/{originalName}/{resolution}/{md5}.{ext}
    const apiPath = path.posix.join('/output', relativePath);

    return {
      resolution: targetWidth.toString(),
      path: apiPath,
    };
  }

  private async resizeImage(
    source: string | Buffer,
    width: number,
    height: number,
    format: string,
    originalExtension: string
  ): Promise<{ buffer: Buffer; extension: string }> {
    const pipeline = sharp(source).resize(width, height, {
      fit: 'fill', // Use exact dimensions (aspect ratio pre-calculated to avoid distortion)
      withoutEnlargement: false, // Allow upscaling smaller images to target resolution
    });

    const strategy = this.formatRegistry.getStrategy(format);
    const buffer = await strategy.encode(pipeline);
    const extension = strategy.getExtension(originalExtension);

    return { buffer, extension };
  }

  private generateMD5(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create directory: ${error.message}`);
      }
      throw error;
    }
  }
}
