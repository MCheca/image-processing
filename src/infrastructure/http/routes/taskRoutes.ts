import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { TaskController } from '../controllers/TaskController';
import { createTaskSchema, getTaskSchema } from '../schemas/taskSchemas';

export interface TaskRoutesOptions extends FastifyPluginOptions {
  taskController: TaskController;
}

export async function taskRoutes(
  server: FastifyInstance,
  options: TaskRoutesOptions
): Promise<void> {
  const { taskController } = options;

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
}
