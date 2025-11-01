import Fastify, { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { createContainer } from '../di/container';
import { registerTaskRoutes } from './routes/taskRoutes';

export const createServer = async (): Promise<FastifyInstance> => {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/image-processing';
  await mongoose.connect(mongoUri);
  server.log.info('Connected to MongoDB');

  // Create dependency injection container
  const container = createContainer();

  // Register routes
  registerTaskRoutes(server, container.taskController);

  // Graceful shutdown
  server.addHook('onClose', async () => {
    await mongoose.connection.close();
    server.log.info('MongoDB connection closed');
  });

  return server;
};
