import { Task } from '../../domain/entities/Task';
import { TaskRepository } from '../../domain/repositories/TaskRepository';

export interface CreateTaskInput {
  originalPath: string;
}

export interface CreateTaskOutput {
  taskId: string;
  status: string;
  price: number;
}

export class CreateTaskUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute(input: CreateTaskInput): Promise<CreateTaskOutput> {
    const task = Task.create(input.originalPath);

    await this.taskRepository.save(task);

    return {
      taskId: task.id,
      status: task.status.value,
      price: task.price.value,
    };
  }
}
