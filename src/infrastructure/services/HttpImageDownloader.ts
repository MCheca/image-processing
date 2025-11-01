import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import { IImageDownloader } from '../../domain/services/IImageDownloader';
import { randomUUID } from 'crypto';

export class HttpImageDownloader implements IImageDownloader {
  isUrl(path: string): boolean {
    return path.startsWith('http://') || path.startsWith('https://');
  }

  async downloadImage(url: string): Promise<{ buffer: Buffer; filename: string }> {
    const extension = this.extractExtension(url);
    const filename = `${randomUUID()}${extension}`;

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https://') ? https : http;
      const chunks: Buffer[] = [];

      protocol
        .get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(
              new Error(
                `Failed to download image: HTTP ${response.statusCode}`
              )
            );
            return;
          }

          response.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });

          response.on('end', () => {
            const buffer = Buffer.concat(chunks);
            resolve({ buffer, filename });
          });

          response.on('error', (error) => {
            reject(
              new Error(`Failed to download image: ${error.message}`)
            );
          });
        })
        .on('error', (error) => {
          reject(
            new Error(`Failed to download image from URL: ${error.message}`)
          );
        });
    });
  }

  private extractExtension(url: string): string {
    const urlPath = new URL(url).pathname;
    const ext = path.extname(urlPath);
    return ext || '.jpg'; // Default to .jpg if no extension found
  }
}
