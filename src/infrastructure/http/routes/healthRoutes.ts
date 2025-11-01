import { FastifyInstance } from 'fastify';
import { DatabaseConnection } from '../../persistence/database';

export async function healthRoutes(server: FastifyInstance): Promise<void> {
  // Liveness probe - is the app running?
  server.get('/health/live', async (_request, reply) => {
    reply.code(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness probe - is the app ready to serve traffic?
  server.get('/health/ready', async (_request, reply) => {
    const database = DatabaseConnection.getInstance();

    const checks = {
      database: database.isReady(),
    };

    const isReady = Object.values(checks).every((check) => check === true);

    reply.code(isReady ? 200 : 503).send({
      status: isReady ? 'ready' : 'not ready',
      checks,
      timestamp: new Date().toISOString(),
    });
  });

  // Detailed health check
  server.get('/health', async (_request, reply) => {
    const database = DatabaseConnection.getInstance();
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 60)} minutes`,
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: database.isReady(),
        name: database.getConnectionName(),
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      },
    });
  });
}
