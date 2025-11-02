import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import { IImageDownloader } from '../../domain/services/IImageDownloader';
import { randomUUID } from 'crypto';

export class HttpImageDownloader implements IImageDownloader {
  isUrl(path: string): boolean {
    return path.startsWith('http://') || path.startsWith('https://');
  }

  async downloadImage(url: string, maxRedirects: number = 5): Promise<{ buffer: Buffer; filename: string }> {
    const extension = this.extractExtension(url);
    const filename = `${randomUUID()}${extension}`;

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https://') ? https : http;
      const chunks: Buffer[] = [];

      protocol
        .get(url, (response) => {
          // Handle redirects (301, 302, 307, 308)
          if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
            const redirectUrl = response.headers.location;

            if (!redirectUrl) {
              reject(new Error(`Redirect without location header: HTTP ${response.statusCode}`));
              return;
            }

            if (maxRedirects <= 0) {
              reject(new Error('Too many redirects'));
              return;
            }

            // Follow the redirect
            this.downloadImage(redirectUrl, maxRedirects - 1)
              .then(resolve)
              .catch(reject);
            return;
          }

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
