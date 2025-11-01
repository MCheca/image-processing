import { FastifyInstance } from 'fastify';
import { TaskController } from '../controllers/TaskController';
import { createTaskSchema, getTaskSchema } from '../schemas/taskSchemas';

export const registerTaskRoutes = (
  server: FastifyInstance,
  taskController: TaskController
): void => {
  // POST /tasks - Create a new task
  server.post(
    '/tasks',
    {
      schema: createTaskSchema,
    },
    async (request, reply) => {
      await taskController.createTask(request, reply);
    }
  );

  // GET /tasks/:taskId - Get task status
  server.get(
    '/tasks/:taskId',
    {
      schema: getTaskSchema,
    },
    async (request, reply) => {
      await taskController.getTask(request, reply);
    }
  );
};
