import { Task } from '../../domain/entities/Task';
import { TaskRepository } from '../../domain/repositories/TaskRepository';
import { ITaskQueue } from '../../domain/services/ITaskQueue';

export interface CreateTaskInput {
  originalPath: string;
}

export interface CreateTaskOutput {
  taskId: string;
  status: string;
  price: number;
}

export class CreateTaskUseCase {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly taskQueue: ITaskQueue
  ) {}

  async execute(input: CreateTaskInput): Promise<CreateTaskOutput> {
    const task = Task.create(input.originalPath);

    await this.taskRepository.save(task);

    await this.taskQueue.addTask(task.id, input.originalPath);

    return {
      taskId: task.id,
      status: task.status.value,
      price: task.price.value,
    };
  }
}
