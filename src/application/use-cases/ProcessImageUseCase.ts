import { TaskRepository } from '../../domain/repositories/TaskRepository';
import { ImageProcessor } from '../../domain/services/ImageProcessor';
import { TaskImage } from '../../domain/entities/Task';
import * as path from 'path';

export interface ProcessImageInput {
  taskId: string;
}

export interface ProcessImageOutput {
  taskId: string;
  status: string;
  images: TaskImage[];
  errorMessage?: string;
}

export class ProcessImageUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly imageProcessor: ImageProcessor
  ) {}

  async execute(input: ProcessImageInput): Promise<ProcessImageOutput> {
    const taskId = this.validateAndNormalizeInput(input);

    const task = await this.taskRepository.findById(taskId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (!task.status.isPending()) {
      return {
        taskId: task.id,
        status: task.status.value,
        images: task.images,
        ...(task.errorMessage && { errorMessage: task.errorMessage }),
      };
    }

    try {
      const outputDir = this.generateOutputDir(task.originalPath);
      const resolutions = [1024, 800];

      const images = await this.imageProcessor.processImage(
        task.originalPath,
        outputDir,
        resolutions
      );

      if (!images || images.length === 0) {
        const failedTask = task.fail('No images generated during processing');
        await this.taskRepository.save(failedTask);
        return {
          taskId: failedTask.id,
          status: failedTask.status.value,
          images: failedTask.images,
          errorMessage: failedTask.errorMessage,
        };
      }

      const completedTask = task.complete(images);
      await this.taskRepository.save(completedTask);
      return {
        taskId: completedTask.id,
        status: completedTask.status.value,
        images: completedTask.images,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const failedTask = task.fail(errorMessage);
      await this.taskRepository.save(failedTask);
      return {
        taskId: failedTask.id,
        status: failedTask.status.value,
        images: failedTask.images,
        errorMessage: failedTask.errorMessage,
      };
    }
  }

  private validateAndNormalizeInput(input: ProcessImageInput): string {
    if (!input.taskId || input.taskId.trim() === '') {
      throw new Error('TaskId cannot be empty');
    }

    return input.taskId.trim();
  }

  private generateOutputDir(originalPath: string): string {
    const basename = path.basename(originalPath, path.extname(originalPath));
    return `/output/${basename}`;
  }
}
