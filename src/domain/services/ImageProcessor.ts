import { TaskImage } from '../entities/Task';

export interface ImageProcessor {
  processImage(
    source: string | Buffer,
    outputDir: string,
    resolutions: number[],
    originalFilename?: string
  ): Promise<TaskImage[]>;
}
