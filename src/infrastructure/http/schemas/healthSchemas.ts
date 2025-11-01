import { FastifySchema } from 'fastify';

export const livenessCheckSchema: FastifySchema = {
  description: 'Liveness probe - checks if the application is running',
  tags: ['health'],
  summary: 'Liveness check',
  response: {
    200: {
      type: 'object',
      description: 'Application is alive',
      properties: {
        status: {
          type: 'string',
          description: 'Health status',
          example: 'ok',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          description: 'Current timestamp',
          example: '2025-11-01T10:30:00.000Z',
        },
      },
      required: ['status', 'timestamp'],
    },
  },
};

export const readinessCheckSchema: FastifySchema = {
  description: 'Readiness probe - checks if the application is ready to serve traffic',
  tags: ['health'],
  summary: 'Readiness check',
  response: {
    200: {
      type: 'object',
      description: 'Application is ready',
      properties: {
        status: {
          type: 'string',
          description: 'Readiness status',
          example: 'ready',
        },
        checks: {
          type: 'object',
          description: 'Individual health checks',
          properties: {
            database: {
              type: 'boolean',
              description: 'Database connection status',
              example: true,
            },
          },
          required: ['database'],
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          description: 'Current timestamp',
          example: '2025-11-01T10:30:00.000Z',
        },
      },
      required: ['status', 'checks', 'timestamp'],
    },
    503: {
      type: 'object',
      description: 'Application is not ready',
      properties: {
        status: {
          type: 'string',
          description: 'Readiness status',
          example: 'not ready',
        },
        checks: {
          type: 'object',
          description: 'Individual health checks',
          properties: {
            database: {
              type: 'boolean',
              description: 'Database connection status',
              example: false,
            },
          },
          required: ['database'],
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          description: 'Current timestamp',
          example: '2025-11-01T10:30:00.000Z',
        },
      },
      required: ['status', 'checks', 'timestamp'],
    },
  },
};

export const detailedHealthCheckSchema: FastifySchema = {
  description: 'Detailed health check with system information',
  tags: ['health'],
  summary: 'Detailed health status',
  response: {
    200: {
      type: 'object',
      description: 'Detailed health information',
      properties: {
        status: {
          type: 'string',
          description: 'Health status',
          example: 'ok',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          description: 'Current timestamp',
          example: '2025-11-01T10:30:00.000Z',
        },
        uptime: {
          type: 'string',
          description: 'Application uptime',
          example: '42 minutes',
        },
        environment: {
          type: 'string',
          description: 'Current environment',
          example: 'production',
        },
        database: {
          type: 'object',
          description: 'Database connection information',
          properties: {
            connected: {
              type: 'boolean',
              description: 'Database connection status',
              example: true,
            },
            name: {
              type: 'string',
              description: 'Database name',
              example: 'image-processing',
            },
          },
          required: ['connected', 'name'],
        },
        memory: {
          type: 'object',
          description: 'Memory usage information',
          properties: {
            rss: {
              type: 'string',
              description: 'Resident Set Size',
              example: '150 MB',
            },
            heapUsed: {
              type: 'string',
              description: 'Heap used',
              example: '80 MB',
            },
            heapTotal: {
              type: 'string',
              description: 'Total heap',
              example: '120 MB',
            },
          },
          required: ['rss', 'heapUsed', 'heapTotal'],
        },
      },
      required: ['status', 'timestamp', 'uptime', 'environment', 'database', 'memory'],
    },
  },
};
