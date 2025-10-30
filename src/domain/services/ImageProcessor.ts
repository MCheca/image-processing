import { TaskImage } from '../entities/Task';

export interface ImageProcessor {
  processImage(
    sourcePath: string,
    outputDir: string,
    resolutions: number[]
  ): Promise<TaskImage[]>;
}
