import { TaskRepository } from '../../domain/repositories/TaskRepository';
import { ImageProcessor } from '../../domain/services/ImageProcessor';
import { Task, TaskImage } from '../../domain/entities/Task';
import { getConfig } from '../../infrastructure/config';

export interface ProcessImageInput {
  taskId: string;
  imageSource?: string | Buffer;
  filename?: string;
}

export interface ProcessImageOutput {
  taskId: string;
  status: string;
  images: TaskImage[];
  errorMessage?: string;
}

export class ProcessImageUseCase {
  private static readonly DEFAULT_RESOLUTIONS = [1024, 800];
  private readonly outputDir: string;

  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly imageProcessor: ImageProcessor
  ) {
    this.outputDir = getConfig().OUTPUT_DIR;
  }

  async execute(input: ProcessImageInput): Promise<ProcessImageOutput> {
    const taskId = this.validateAndNormalizeInput(input);

    const task = await this.taskRepository.findById(taskId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (!task.status.isPending()) {
      return this.toOutput(task);
    }

    try {
      const outputDir = this.generateOutputDir(task.originalPath);

      // Use provided imageSource (Buffer or path), otherwise fall back to task.originalPath
      const source = input.imageSource || task.originalPath;
      const filename = input.filename;

      const images = await this.imageProcessor.processImage(
        source,
        outputDir,
        ProcessImageUseCase.DEFAULT_RESOLUTIONS,
        filename
      );

      if (!images || images.length === 0) {
        const failedTask = task.fail('No images generated during processing');
        await this.taskRepository.save(failedTask);
        return this.toOutput(failedTask);
      }

      const completedTask = task.complete(images);
      await this.taskRepository.save(completedTask);
      return this.toOutput(completedTask);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const failedTask = task.fail(errorMessage);
      await this.taskRepository.save(failedTask);
      return this.toOutput(failedTask);
    }
  }

  private validateAndNormalizeInput(input: ProcessImageInput): string {
    if (!input.taskId || input.taskId.trim() === '') {
      throw new Error('TaskId cannot be empty');
    }

    return input.taskId.trim();
  }

  private generateOutputDir(_originalPath: string): string {
    return this.outputDir;
  }

  private toOutput(task: Task): ProcessImageOutput {
    return {
      taskId: task.id,
      status: task.status.value,
      images: task.images,
      ...(task.errorMessage && { errorMessage: task.errorMessage }),
    };
  }
}
