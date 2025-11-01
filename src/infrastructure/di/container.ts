import { TaskController } from '../http/controllers/TaskController';
import { CreateTaskUseCase } from '../../application/use-cases/CreateTaskUseCase';
import { GetTaskUseCase } from '../../application/use-cases/GetTaskUseCase';
import { ProcessImageUseCase } from '../../application/use-cases/ProcessImageUseCase';
import { MongoTaskRepository } from '../repositories/MongoTaskRepository';
import { SharpImageProcessor } from '../services/SharpImageProcessor';
import { SyncTaskQueue } from '../queues/SyncTaskQueue';

export interface Container {
  taskController: TaskController;
}

export const createContainer = (): Container => {
  // Repositories
  const taskRepository = new MongoTaskRepository();

  // Services
  const imageProcessor = new SharpImageProcessor();

  // Use Cases
  const processImageUseCase = new ProcessImageUseCase(taskRepository, imageProcessor);
  const taskQueue = new SyncTaskQueue(processImageUseCase);
  const createTaskUseCase = new CreateTaskUseCase(taskRepository, taskQueue);
  const getTaskUseCase = new GetTaskUseCase(taskRepository);

  // Controllers
  const taskController = new TaskController(createTaskUseCase, getTaskUseCase);

  return {
    taskController,
  };
};
