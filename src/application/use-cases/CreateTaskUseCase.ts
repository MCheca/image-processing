import { Task } from '../../domain/entities/Task';
import { TaskRepository } from '../../domain/repositories/TaskRepository';
import { ITaskQueue } from '../../domain/services/ITaskQueue';
import { IImageDownloader } from '../../domain/services/IImageDownloader';

export interface CreateTaskInput {
  originalPath: string;
}

export interface CreateTaskOutput {
  taskId: string;
  status: string;
  price: number;
}

export interface ImageSource {
  source: string | Buffer;
  filename: string;
  isUrl: boolean;
}

export class CreateTaskUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly taskQueue: ITaskQueue,
    private readonly imageDownloader?: IImageDownloader
  ) {}

  async execute(input: CreateTaskInput): Promise<CreateTaskOutput> {
    // Download image from URL if needed, otherwise use path as-is
    const imageSource = await this.resolveImageSource(input.originalPath);

    // Store the original URL or path in the task
    const task = Task.create(input.originalPath);

    await this.taskRepository.save(task);

    // Pass the actual source (Buffer or path) to the queue
    await this.taskQueue.addTask(task.id, imageSource.source, imageSource.filename);

    return {
      taskId: task.id,
      status: task.status.value,
      price: task.price.value,
    };
  }

  private async resolveImageSource(path: string): Promise<ImageSource> {
    if (this.imageDownloader && this.imageDownloader.isUrl(path)) {
      const { buffer, filename } = await this.imageDownloader.downloadImage(path);
      return {
        source: buffer,
        filename,
        isUrl: true,
      };
    }
    return {
      source: path,
      filename: path,
      isUrl: false,
    };
  }
}
