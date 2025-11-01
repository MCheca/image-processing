import { FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseConnection } from '../../persistence/database';

export class HealthController {
  constructor(private readonly database: DatabaseConnection) {}

  async livenessCheck(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.code(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }

  async readinessCheck(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const checks = {
      database: this.database.isReady(),
    };

    const isReady = Object.values(checks).every((check) => check === true);

    reply.code(isReady ? 200 : 503).send({
      status: isReady ? 'ready' : 'not ready',
      checks,
      timestamp: new Date().toISOString(),
    });
  }

  async detailedHealthCheck(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 60)} minutes`,
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: this.database.isReady(),
        name: this.database.getConnectionName(),
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      },
    });
  }
}
