import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { HealthController } from '../controllers/HealthController';
import {
  livenessCheckSchema,
  readinessCheckSchema,
  detailedHealthCheckSchema,
} from '../schemas/healthSchemas';

export interface HealthRoutesOptions extends FastifyPluginOptions {
  healthController: HealthController;
}

export async function healthRoutes(
  server: FastifyInstance,
  options: HealthRoutesOptions
): Promise<void> {
  const { healthController } = options;

  // GET /health/live - Liveness probe
  server.get(
    '/health/live',
    {
      schema: livenessCheckSchema,
    },
    async (request, reply) => {
      await healthController.livenessCheck(request, reply);
    }
  );

  // GET /health/ready - Readiness probe
  server.get(
    '/health/ready',
    {
      schema: readinessCheckSchema,
    },
    async (request, reply) => {
      await healthController.readinessCheck(request, reply);
    }
  );

  // GET /health - Detailed health check
  server.get(
    '/health',
    {
      schema: detailedHealthCheckSchema,
    },
    async (request, reply) => {
      await healthController.detailedHealthCheck(request, reply);
    }
  );
}
