export interface IImageDownloader {
  /**
   * Downloads an image from a URL to a temporary location in memory/disk
   * @param url - The URL of the image to download
   * @returns Object containing the downloaded buffer and suggested filename
   * @throws Error if the download fails
   */
  downloadImage(url: string): Promise<{ buffer: Buffer; filename: string }>;

  /**
   * Checks if a given path is a URL
   * @param path - The path to check
   * @returns true if the path is a URL, false otherwise
   */
  isUrl(path: string): boolean;
}
