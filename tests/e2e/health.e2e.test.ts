import { FastifyInstance } from 'fastify';
import request from 'supertest';
import { createServer } from '../../src/infrastructure/http/server';
import { DatabaseConnection } from '../../src/infrastructure/persistence/database';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { RedisMemoryServer } from 'redis-memory-server';

describe('Health Routes E2E Tests', () => {
  let server: FastifyInstance;
  let mongoServer: MongoMemoryServer;
  let redisServer: RedisMemoryServer;
  let database: DatabaseConnection;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
  
    database = DatabaseConnection.getInstance();
    await database.connect({ uri: mongoUri });
  
    redisServer = new RedisMemoryServer();
    const host = await redisServer.getHost();
    const port = await redisServer.getPort();
  
    server = await createServer({ redis: { host, port } });
    await server.ready();
  }, 30000);

  afterAll(async () => {
    if (server) await server.close();
    if (database) await database.disconnect();
    if (mongoServer) await mongoServer.stop();
    if (redisServer) await redisServer.stop();
  }, 30000);

  describe('GET /health/live', () => {
    it('should return 200 with liveness status', async () => {
      const response = await request(server.server)
        .get('/health/live')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should return valid ISO timestamp', async () => {
      const response = await request(server.server)
        .get('/health/live')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });

    it('should not accept POST method', async () => {
      await request(server.server)
        .post('/health/live')
        .expect(404);
    });

    it('should not accept PUT method', async () => {
      await request(server.server)
        .put('/health/live')
        .expect(404);
    });

    it('should not accept DELETE method', async () => {
      await request(server.server)
        .delete('/health/live')
        .expect(404);
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 with readiness status when database is connected', async () => {
      const response = await request(server.server)
        .get('/health/ready')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'ready');
      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toHaveProperty('database', true);
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should include database check in response', async () => {
      const response = await request(server.server)
        .get('/health/ready')
        .expect(200);

      expect(response.body.checks).toEqual({
        database: true,
      });
    });

    it('should return valid ISO timestamp', async () => {
      const response = await request(server.server)
        .get('/health/ready')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });

    it('should not accept POST method', async () => {
      await request(server.server)
        .post('/health/ready')
        .expect(404);
    });

    it('should not accept PUT method', async () => {
      await request(server.server)
        .put('/health/ready')
        .expect(404);
    });

    it('should not accept DELETE method', async () => {
      await request(server.server)
        .delete('/health/ready')
        .expect(404);
    });
  });

  describe('GET /health', () => {
    it('should return 200 with detailed health information', async () => {
      const response = await request(server.server)
        .get('/health')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('memory');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should include database information', async () => {
      const response = await request(server.server)
        .get('/health')
        .expect(200);

      expect(response.body.database).toHaveProperty('connected', true);
      expect(response.body.database).toHaveProperty('name');
      expect(typeof response.body.database.name).toBe('string');
    });

    it('should include memory information', async () => {
      const response = await request(server.server)
        .get('/health')
        .expect(200);

      expect(response.body.memory).toHaveProperty('rss');
      expect(response.body.memory).toHaveProperty('heapUsed');
      expect(response.body.memory).toHaveProperty('heapTotal');
      expect(typeof response.body.memory.rss).toBe('string');
      expect(typeof response.body.memory.heapUsed).toBe('string');
      expect(typeof response.body.memory.heapTotal).toBe('string');
      expect(response.body.memory.rss).toMatch(/\d+ MB/);
      expect(response.body.memory.heapUsed).toMatch(/\d+ MB/);
      expect(response.body.memory.heapTotal).toMatch(/\d+ MB/);
    });

    it('should include uptime as a string', async () => {
      const response = await request(server.server)
        .get('/health')
        .expect(200);

      expect(typeof response.body.uptime).toBe('string');
      expect(response.body.uptime).toMatch(/\d+ minutes/);
    });

    it('should include environment', async () => {
      const response = await request(server.server)
        .get('/health')
        .expect(200);

      expect(typeof response.body.environment).toBe('string');
      expect(response.body.environment.length).toBeGreaterThan(0);
    });

    it('should return valid ISO timestamp', async () => {
      const response = await request(server.server)
        .get('/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });

    it('should not accept POST method', async () => {
      await request(server.server)
        .post('/health')
        .expect(404);
    });

    it('should not accept PUT method', async () => {
      await request(server.server)
        .put('/health')
        .expect(404);
    });

    it('should not accept DELETE method', async () => {
      await request(server.server)
        .delete('/health')
        .expect(404);
    });
  });

  describe('Health Routes - Edge Cases', () => {
    it('should handle trailing slashes correctly', async () => {
      await request(server.server)
        .get('/health/')
        .expect(200);

      await request(server.server)
        .get('/health/live/')
        .expect(200);

      await request(server.server)
        .get('/health/ready/')
        .expect(200);
    });

    it('should return 404 for non-existent health routes', async () => {
      await request(server.server)
        .get('/health/unknown')
        .expect(404);

      await request(server.server)
        .get('/health/live/extra')
        .expect(404);

      await request(server.server)
        .get('/health/ready/extra')
        .expect(404);
    });

    it('should handle case-sensitive routes correctly', async () => {
      await request(server.server)
        .get('/Health/live')
        .expect(404);

      await request(server.server)
        .get('/HEALTH/ready')
        .expect(404);

      await request(server.server)
        .get('/health/LIVE')
        .expect(404);
    });
  });
});
