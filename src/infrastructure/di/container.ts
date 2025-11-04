import { TaskController } from '../http/controllers/TaskController';
import { HealthController } from '../http/controllers/HealthController';
import { CreateTaskUseCase } from '../../application/use-cases/CreateTaskUseCase';
import { GetTaskUseCase } from '../../application/use-cases/GetTaskUseCase';
import { ProcessImageUseCase } from '../../application/use-cases/ProcessImageUseCase';
import { MongoTaskRepository } from '../repositories/MongoTaskRepository';
import { SharpImageProcessor } from '../services/SharpImageProcessor';
import { HttpImageDownloader } from '../services/HttpImageDownloader';
import { BullMQTaskQueue } from '../queues/BullMQTaskQueue';
import { BullMQWorker } from '../queues/BullMQWorker';
import { DatabaseConnection } from '../persistence/database';
import { config } from '../config';

export interface Container {
  taskController: TaskController;
  healthController: HealthController;
  worker: BullMQWorker;
  taskQueue: BullMQTaskQueue;
  shutdown: () => Promise<void>;
}

export const createContainer = async (): Promise<Container> => {
  const redisConfig = {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD,
  };

  // Repositories
  const taskRepository = new MongoTaskRepository();

  // Services
  const imageProcessor = new SharpImageProcessor();
  const imageDownloader = new HttpImageDownloader();

  // Use cases
  const processImageUseCase = new ProcessImageUseCase(taskRepository, imageProcessor);

  // Queue and worker
  const taskQueue = new BullMQTaskQueue(redisConfig);
  const worker = new BullMQWorker(redisConfig, processImageUseCase, {
    concurrency: config.QUEUE_CONCURRENCY,
  });

  // ✅ Wait until BullMQ is actually ready
  await taskQueue.queue.waitUntilReady();
  await worker.waitUntilReady();

  const createTaskUseCase = new CreateTaskUseCase(taskRepository, taskQueue, imageDownloader);
  const getTaskUseCase = new GetTaskUseCase(taskRepository);

  const taskController = new TaskController(createTaskUseCase, getTaskUseCase);
  const database = DatabaseConnection.getInstance();
  const healthController = new HealthController(database);

  const shutdown = async (): Promise<void> => {
    await taskQueue.close();
    await worker.close();
  };

  return {
    taskController,
    healthController,
    worker,
    taskQueue,
    shutdown,
  };
};