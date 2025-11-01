import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import mongoose from 'mongoose';
import { createContainer } from '../di/container';
import { registerTaskRoutes } from './routes/taskRoutes';
import { errorHandler } from './middleware/errorHandler';
import { errorResponseSchema } from './schemas/taskSchemas';

export const createServer = async (): Promise<FastifyInstance> => {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
    bodyLimit: 10 * 1024 * 1024, // 10MB limit
    caseSensitive: true,
    ignoreTrailingSlash: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    trustProxy: process.env.TRUST_PROXY === 'true',
  });

  // Register error response schema
  server.addSchema(errorResponseSchema);

  // Register CORS
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
    maxAge: 86400, // 24 hours
  });

  // Register Helmet for security headers
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  // Register rate limiting
  await server.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '15 minutes',
    cache: 10000,
    allowList: ['127.0.0.1'],
    errorResponseBuilder: (_req, context) => ({
      code: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry after ${context.after}`,
      date: Date.now(),
      expiresIn: context.ttl,
    }),
  });

  // Set error handler
  server.setErrorHandler(errorHandler);

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
