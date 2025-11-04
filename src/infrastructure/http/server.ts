import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
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
    routerOptions: {
      caseSensitive: true,
      ignoreTrailingSlash: true,
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    trustProxy: config.TRUST_PROXY,
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: true,
        useDefaults: true,
      },
      plugins: [
        function (ajv: any) {
          ajv.addKeyword('example');
        },
      ],
    },
  });

  // Register error response schema
  server.addSchema(errorResponseSchema);

  // Register Swagger
  await server.register(swagger, {
    openapi: {
      info: {
        title: 'Image Processing API',
        description: 'REST API for image processing with task management. Upload images and process them into multiple resolutions.',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${config.PORT}`,
          description: 'Development server',
        },
      ],
      tags: [
        { name: 'tasks', description: 'Task management endpoints' },
        { name: 'health', description: 'Health check endpoints' },
      ],
      components: {
        schemas: {
          ErrorResponse: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
              statusCode: { type: 'number' },
            },
          },
        },
      },
    },
  });

  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

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
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    global: true,
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

  // Store container on server for access to shutdown function
  server.decorate('container', container);

  // Register routes
  await server.register(healthRoutes, { healthController: container.healthController });
  await server.register(taskRoutes, { taskController: container.taskController });

  return server;
};
