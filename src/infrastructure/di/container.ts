import { TaskController } from '../http/controllers/TaskController';
import { CreateTaskUseCase } from '../../application/use-cases/CreateTaskUseCase';
import { GetTaskUseCase } from '../../application/use-cases/GetTaskUseCase';
import { MongoTaskRepository } from '../repositories/MongoTaskRepository';

export interface Container {
  taskController: TaskController;
}

export const createContainer = (): Container => {
  // Repositories
  const taskRepository = new MongoTaskRepository();

  // Use Cases
  const createTaskUseCase = new CreateTaskUseCase(taskRepository);
  const getTaskUseCase = new GetTaskUseCase(taskRepository);

  // Controllers
  const taskController = new TaskController(createTaskUseCase, getTaskUseCase);

  return {
    taskController,
  };
};
