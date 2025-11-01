import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { createContainer } from '../di/container';
import { taskRoutes } from './routes/taskRoutes';
import { healthRoutes } from './routes/healthRoutes';
import { errorHandler } from './middleware/errorHandler';
import { errorResponseSchema } from './schemas/taskSchemas';
import { config } from '../config';

export const createServer = async (): Promise<FastifyInstance> => {
  const server = Fastify({
    logger: {
      level: config.LOG_LEVEL,
    },
    bodyLimit: 10 * 1024 * 1024, // 10MB limit
    caseSensitive: true,
    ignoreTrailingSlash: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    trustProxy: config.TRUST_PROXY,
  });

  // Register error response schema
  server.addSchema(errorResponseSchema);

  // Register CORS
  await server.register(cors, {
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: config.CORS_CREDENTIALS,
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
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
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

  // Create dependency injection container
  const container = createContainer();

  // Register routes
  await server.register(healthRoutes);
  await server.register(taskRoutes, { taskController: container.taskController });

  return server;
};
