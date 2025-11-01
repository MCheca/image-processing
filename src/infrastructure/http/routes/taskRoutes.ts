import { FastifyInstance } from 'fastify';
import { TaskController } from '../controllers/TaskController';

export const registerTaskRoutes = (
  server: FastifyInstance,
  taskController: TaskController
): void => {
  // POST /tasks - Create a new task
  server.post('/tasks', async (request, reply) => {
    await taskController.createTask(request, reply);
  });

  // GET /tasks/:taskId - Get task status
  server.get('/tasks/:taskId', async (request, reply) => {
    await taskController.getTask(request, reply);
  });
};
