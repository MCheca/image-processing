import { TaskRepository } from '../../domain/repositories/TaskRepository';
import { TaskImage } from '../../domain/entities/Task';

export interface GetTaskInput {
  taskId: string;
}

export interface GetTaskOutput {
  taskId: string;
  status: string;
  price: number;
  images: TaskImage[];
  errorMessage?: string;
}

export class GetTaskUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute(input: GetTaskInput): Promise<GetTaskOutput> {
    const taskId = this.validateAndNormalizeInput(input);

    const task = await this.taskRepository.findById(taskId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return {
      taskId: task.id,
      status: task.status.value,
      price: task.price.value,
      images: task.images,
      ...(task.errorMessage && { errorMessage: task.errorMessage }),
    };
  }

  private validateAndNormalizeInput(input: GetTaskInput): string {
    if (!input.taskId || input.taskId.trim() === '') {
      throw new Error('TaskId cannot be empty');
    }

    return input.taskId.trim();
  }
}
