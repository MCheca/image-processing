// Test output directory (set via OUTPUT_DIR env var in package.json test script)
const testOutputDir = process.env.OUTPUT_DIR || './output-test';

import { FastifyInstance } from 'fastify';
import request from 'supertest';
import { createServer } from '../../src/infrastructure/http/server';
import { DatabaseConnection } from '../../src/infrastructure/persistence/database';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getConfig } from '../../src/infrastructure/config';
import nock from 'nock';

// Response type interface for test assertions
interface TaskResponse {
  taskId: string;
  status: 'pending' | 'completed' | 'failed';
  price: number;
  images: Array<{ resolution: string; path: string }>;
  errorMessage?: string;
}

// Constants for test URLs and paths
const MOCK_IMAGE_URL = 'https://picsum.photos/800/600';
const MOCK_SMALL_IMAGE_URL = 'https://picsum.photos/400/300';
const BAD_DOMAIN_URL = 'https://bad-domain-that-does-not-exist.com/image.jpg';

describe('Task Routes E2E Tests', () => {
  let server: FastifyInstance;
  let mongoServer: MongoMemoryServer;
  let database: DatabaseConnection;
  let outputDir: string;
  const mockImagePath = path.join(__dirname, '..', 'fixtures', 'test-image.jpg');

  /**
   * Polls the GET /tasks/:taskId endpoint until the task reaches a desired status.
   * Throws an error if the timeout is exceeded.
   */
  const pollForTaskStatus = async (
    taskId: string,
    desiredStatus: 'completed' | 'failed',
    timeout = 10000,
  ): Promise<TaskResponse> => {
    const startTime = Date.now();
    const pollInterval = 500;

    while (Date.now() - startTime < timeout) {
      const response = await request(server.server).get(`/tasks/${taskId}`);

      if (response.status === 200 && response.body.status === desiredStatus) {
        return response.body as TaskResponse;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Task ${taskId} did not reach status ${desiredStatus} within ${timeout}ms.`);
  };

  beforeAll(async () => {
    // Ensure test output directory exists
    await fs.mkdir(testOutputDir, { recursive: true });

    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to database
    database = DatabaseConnection.getInstance();
    await database.connect({ uri: mongoUri });

    // Create server (will use the OUTPUT_DIR env variable we just set)
    server = await createServer();
    await server.ready();

    // Get output directory from config
    const config = getConfig();
    outputDir = path.resolve(config.OUTPUT_DIR);
  }, 30000);

  beforeEach(async () => {
    // Set up nock to intercept image downloads and reply with local test file
    nock('https://picsum.photos')
      .persist()
      .get(/\/\d+\/\d+/)
      .replyWithFile(200, mockImagePath, {
        'Content-Type': 'image/jpeg',
      });

    // Mock for failure tests
    nock('https://bad-domain-that-does-not-exist.com')
      .get('/image.jpg')
      .reply(500, 'Internal Server Error');
  });

  afterEach(async () => {
    // Clean up nock mocks
    nock.cleanAll();

    // Fast and dumb cleanup - nuke and re-create output directory
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
      await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
      console.error('Failed to clean up output directory:', error);
    }

    // Clean up database
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }, 15000);

  afterAll(async () => {
    await server.close();
    await database.disconnect();
    await mongoServer.stop();

    // Clean up test output directory completely
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up test output directory:', error);
    }
  }, 30000);

  describe('POST /tasks', () => {
    describe('Success Cases', () => {
      it('should create a task with valid image URL', async () => {
        const response = await request(server.server)
          .post('/tasks')
          .send({ originalPath: MOCK_IMAGE_URL })
          .expect(201)
          .expect('Content-Type', /json/);

        expect(response.body).toHaveProperty('taskId');
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('price');
        expect(typeof response.body.taskId).toBe('string');
        expect(response.body.taskId.length).toBeGreaterThan(0);
        expect(['pending', 'completed', 'failed']).toContain(response.body.status);
        expect(typeof response.body.price).toBe('number');
        expect(response.body.price).toBeGreaterThanOrEqual(0);
      });

      it('should generate unique task IDs for multiple tasks', async () => {
        const response1 = await request(server.server)
          .post('/tasks')
          .send({ originalPath: MOCK_IMAGE_URL })
          .expect(201);

        const response2 = await request(server.server)
          .post('/tasks')
          .send({ originalPath: MOCK_SMALL_IMAGE_URL })
          .expect(201);

        expect(response1.body.taskId).not.toBe(response2.body.taskId);
      });

      it('should accept very long URLs within limit', async () => {
        const longUrl = 'https://picsum.photos/800/600?random=' + 'a'.repeat(1900);
        const response = await request(server.server)
          .post('/tasks')
          .send({ originalPath: longUrl })
          .expect(201);

        expect(response.body).toHaveProperty('taskId');
      });
    });

    describe('Validation Errors', () => {
      it('should return 400 when originalPath is missing', async () => {
        const response = await request(server.server)
          .post('/tasks')
          .send({})
          .expect(400)
          .expect('Content-Type', /json/);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should return 400 when originalPath is empty string', async () => {
        const response = await request(server.server)
          .post('/tasks')
          .send({ originalPath: '' })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should return 400 when originalPath is null', async () => {
        const response = await request(server.server)
          .post('/tasks')
          .send({ originalPath: null })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should return 400 when originalPath is an object', async () => {
        const response = await request(server.server)
          .post('/tasks')
          .send({ originalPath: { url: 'https://picsum.photos/800/600' } })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should return 400 when originalPath is an array', async () => {
        const response = await request(server.server)
          .post('/tasks')
          .send({ originalPath: ['https://picsum.photos/800/600'] })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should return 400 when originalPath exceeds maximum length', async () => {
        const tooLongUrl = 'https://picsum.photos/800/600?param=' + 'a'.repeat(3000);
        const response = await request(server.server)
          .post('/tasks')
          .send({ originalPath: tooLongUrl })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('statusCode', 400);
      });

      it('should return 400 when body is empty', async () => {
        await request(server.server)
          .post('/tasks')
          .expect(400);
      });

      it('should return 415 when Content-Type is not JSON', async () => {
        await request(server.server)
          .post('/tasks')
          .send('originalPath=https://picsum.photos/800/600')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .expect(415);
      });
    });

    describe('HTTP Method Tests', () => {
      it('should not accept GET method on /tasks', async () => {
        await request(server.server)
          .get('/tasks')
          .expect(404);
      });

      it('should not accept PUT method on /tasks', async () => {
        await request(server.server)
          .put('/tasks')
          .send({ originalPath: 'https://picsum.photos/800/600' })
          .expect(404);
      });

      it('should not accept DELETE method on /tasks', async () => {
        await request(server.server)
          .delete('/tasks')
          .expect(404);
      });

      it('should not accept PATCH method on /tasks', async () => {
        await request(server.server)
          .patch('/tasks')
          .send({ originalPath: 'https://picsum.photos/800/600' })
          .expect(404);
      });
    });

    describe('Concurrent Requests', () => {
      it('should handle multiple concurrent task creation requests', async () => {
        const requests = Array(5)
          .fill(null)
          .map(() =>
            request(server.server)
              .post('/tasks')
              .send({ originalPath: MOCK_IMAGE_URL })
          );

        const responses = await Promise.all(requests);

        // All should succeed
        responses.forEach((response) => {
          expect(response.status).toBe(201);
          expect(response.body).toHaveProperty('taskId');
        });

        // All task IDs should be unique
        const taskIds = responses.map((r) => r.body.taskId);
        const uniqueTaskIds = new Set(taskIds);
        expect(uniqueTaskIds.size).toBe(taskIds.length);
      });
    });
  });

  describe('GET /tasks/:taskId', () => {
    describe('Success Cases', () => {
      it('should retrieve an existing task by ID', async () => {
        // Create a task first
        const createResponse = await request(server.server)
          .post('/tasks')
          .send({ originalPath: MOCK_IMAGE_URL })
          .expect(201);

        const taskId = createResponse.body.taskId;

        // Retrieve the task
        const getResponse = await request(server.server)
          .get(`/tasks/${taskId}`)
          .expect(200)
          .expect('Content-Type', /json/);

        expect(getResponse.body).toHaveProperty('taskId', taskId);
        expect(getResponse.body).toHaveProperty('status');
        expect(getResponse.body).toHaveProperty('price');
        expect(getResponse.body).toHaveProperty('images');
        expect(['pending', 'completed', 'failed']).toContain(getResponse.body.status);
        expect(typeof getResponse.body.price).toBe('number');
        expect(Array.isArray(getResponse.body.images)).toBe(true);
      });

      it('should return images array for completed task', async () => {
        // Create task
        const createResponse = await request(server.server)
          .post('/tasks')
          .send({ originalPath: MOCK_IMAGE_URL })
          .expect(201);

        const taskId = createResponse.body.taskId;

        // Poll for completion
        const completedTask = await pollForTaskStatus(taskId, 'completed');

        // Assert
        expect(completedTask.status).toBe('completed');
        expect(Array.isArray(completedTask.images)).toBe(true);
        expect(completedTask.images.length).toBeGreaterThan(0);

        // Verify image structure
        completedTask.images.forEach((image) => {
          expect(image).toHaveProperty('resolution');
          expect(image).toHaveProperty('path');
          expect(typeof image.resolution).toBe('string');
          expect(typeof image.path).toBe('string');
        });
      }, 15000);

      it('should retrieve multiple different tasks', async () => {
        // Create multiple tasks
        const task1 = await request(server.server)
          .post('/tasks')
          .send({ originalPath: MOCK_IMAGE_URL })
          .expect(201);

        const task2 = await request(server.server)
          .post('/tasks')
          .send({ originalPath: MOCK_SMALL_IMAGE_URL })
          .expect(201);

        // Retrieve both tasks
        const get1 = await request(server.server)
          .get(`/tasks/${task1.body.taskId}`)
          .expect(200);

        const get2 = await request(server.server)
          .get(`/tasks/${task2.body.taskId}`)
          .expect(200);

        expect(get1.body.taskId).toBe(task1.body.taskId);
        expect(get2.body.taskId).toBe(task2.body.taskId);
        expect(get1.body.taskId).not.toBe(get2.body.taskId);
      });
    });

    describe('Not Found Cases', () => {
      it('should return 404 for non-existent task ID', async () => {
        const fakeTaskId = new mongoose.Types.ObjectId().toString();
        const response = await request(server.server)
          .get(`/tasks/${fakeTaskId}`)
          .expect(404)
          .expect('Content-Type', /json/);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('statusCode', 404);
      });

      it('should return 404 for invalid task ID format', async () => {
        const response = await request(server.server)
          .get('/tasks/invalid-id-format')
          .expect(404);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('statusCode', 404);
      });

      it('should return 404 for empty task ID', async () => {
        await request(server.server)
          .get('/tasks/')
          .expect(404);
      });

      it('should return 404 for very long invalid task ID', async () => {
        const longId = 'a'.repeat(1000);
        await request(server.server)
          .get(`/tasks/${longId}`)
          .expect(404);
      });
    });

    describe('HTTP Method Tests', () => {
      it('should not accept POST method on /tasks/:taskId', async () => {
        const taskId = new mongoose.Types.ObjectId().toString();
        await request(server.server)
          .post(`/tasks/${taskId}`)
          .send({ data: 'test' })
          .expect(404);
      });

      it('should not accept PUT method on /tasks/:taskId', async () => {
        const taskId = new mongoose.Types.ObjectId().toString();
        await request(server.server)
          .put(`/tasks/${taskId}`)
          .send({ data: 'test' })
          .expect(404);
      });

      it('should not accept DELETE method on /tasks/:taskId', async () => {
        const taskId = new mongoose.Types.ObjectId().toString();
        await request(server.server)
          .delete(`/tasks/${taskId}`)
          .expect(404);
      });

      it('should not accept PATCH method on /tasks/:taskId', async () => {
        const taskId = new mongoose.Types.ObjectId().toString();
        await request(server.server)
          .patch(`/tasks/${taskId}`)
          .send({ data: 'test' })
          .expect(404);
      });
    });

    describe('Concurrent Requests', () => {
      it('should handle multiple concurrent GET requests for same task', async () => {
        // Create a task
        const createResponse = await request(server.server)
          .post('/tasks')
          .send({ originalPath: MOCK_IMAGE_URL })
          .expect(201);

        const taskId = createResponse.body.taskId;

        // Make concurrent GET requests
        const requests = Array(10)
          .fill(null)
          .map(() => request(server.server).get(`/tasks/${taskId}`));

        const responses = await Promise.all(requests);

        // All should succeed and return the same task
        responses.forEach((response) => {
          expect(response.status).toBe(200);
          expect(response.body.taskId).toBe(taskId);
        });
      });

      it('should handle concurrent GET requests for different tasks', async () => {
        // Create multiple tasks
        const createRequests = Array(5)
          .fill(null)
          .map(() =>
            request(server.server)
              .post('/tasks')
              .send({ originalPath: MOCK_IMAGE_URL })
          );

        const createResponses = await Promise.all(createRequests);
        const taskIds = createResponses.map((r) => r.body.taskId);

        // Concurrently retrieve all tasks
        const getRequests = taskIds.map((taskId) =>
          request(server.server).get(`/tasks/${taskId}`)
        );

        const getResponses = await Promise.all(getRequests);

        // All should succeed
        getResponses.forEach((response, index) => {
          expect(response.status).toBe(200);
          expect(response.body.taskId).toBe(taskIds[index]);
        });
      });
    });
  });

  describe('Task Processing Integration', () => {
    it('should complete full task lifecycle: create, process, and retrieve', async () => {
      // Step 1: Create a task
      const createResponse = await request(server.server)
        .post('/tasks')
        .send({ originalPath: MOCK_IMAGE_URL })
        .expect(201);

      expect(createResponse.body).toHaveProperty('taskId');
      const taskId = createResponse.body.taskId;
      const price = createResponse.body.price;

      // Step 2: Poll until task completes
      const completedTask = await pollForTaskStatus(taskId, 'completed');

      // Step 3: Verify completion
      expect(completedTask.taskId).toBe(taskId);
      expect(completedTask.price).toBe(price);
      expect(completedTask.status).toBe('completed');
      expect(Array.isArray(completedTask.images)).toBe(true);
      expect(completedTask.images.length).toBeGreaterThan(0);

      // Step 4: Verify we can still retrieve it
      const getResponse = await request(server.server)
        .get(`/tasks/${taskId}`)
        .expect(200);

      expect(getResponse.body.status).toBe('completed');
      expect(getResponse.body.images.length).toBe(completedTask.images.length);
    }, 15000);

    it('should handle rapid create-retrieve cycles', async () => {
      for (let i = 0; i < 3; i++) {
        const createResponse = await request(server.server)
          .post('/tasks')
          .send({ originalPath: MOCK_IMAGE_URL })
          .expect(201);

        const getResponse = await request(server.server)
          .get(`/tasks/${createResponse.body.taskId}`)
          .expect(200);

        expect(getResponse.body.taskId).toBe(createResponse.body.taskId);
      }
    });

    it('should process tasks with deterministic output structure', async () => {
      // Create task
      const createResponse = await request(server.server)
        .post('/tasks')
        .send({ originalPath: MOCK_IMAGE_URL })
        .expect(201);

      const taskId = createResponse.body.taskId;

      // Poll for completion
      const completedTask = await pollForTaskStatus(taskId, 'completed');

      // Verify deterministic output structure
      expect(completedTask.status).toBe('completed');
      expect(completedTask.images.length).toBeGreaterThan(0);

      // Check that we have multiple resolutions
      const resolutions = completedTask.images.map((img) => img.resolution);
      expect(resolutions.length).toBeGreaterThanOrEqual(2);
      // Verify each resolution has a unique value
      const uniqueResolutions = new Set(resolutions);
      expect(uniqueResolutions.size).toBeGreaterThanOrEqual(2);

      // Verify path structure for each resolution
      completedTask.images.forEach((image) => {
        expect(image.path).toContain(image.resolution);
        // Verify it has an image extension (jpg, webp, png, etc.)
        expect(image.path).toMatch(/\.(jpg|jpeg|webp|png)$/i);
      });
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should create a FAILED task if download fails', async () => {
      // Override the default nock to simulate a download failure
      nock.cleanAll();
      nock('https://bad-domain-that-does-not-exist.com')
        .get('/image.jpg')
        .replyWithError({ code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND' });

      // Create a task with a URL that will fail
      const createResponse = await request(server.server)
        .post('/tasks')
        .send({ originalPath: BAD_DOMAIN_URL });

      // The task might be created with 201 or failed immediately with 500
      if (createResponse.status === 201) {
        const taskId = createResponse.body.taskId;

        // Poll for failure
        const failedTask = await pollForTaskStatus(taskId, 'failed');

        expect(failedTask.status).toBe('failed');
        expect(failedTask).toHaveProperty('errorMessage');
        expect(typeof failedTask.errorMessage).toBe('string');
        expect(failedTask.errorMessage!.length).toBeGreaterThan(0);
      } else {
        // If it failed immediately, that's also acceptable
        expect(createResponse.status).toBe(500);
      }

      // Restore default nock setup
      nock.cleanAll();
      nock('https://picsum.photos')
        .persist()
        .get(/\/\d+\/\d+/)
        .replyWithFile(200, mockImagePath, {
          'Content-Type': 'image/jpeg',
        });
    }, 15000);
  });

  describe('Route Case Sensitivity', () => {
    it('should handle case-sensitive routes correctly', async () => {
      await request(server.server)
        .post('/Tasks')
        .send({ originalPath: 'https://picsum.photos/800/600' })
        .expect(404);

      await request(server.server)
        .post('/TASKS')
        .send({ originalPath: 'https://picsum.photos/800/600' })
        .expect(404);
    });

    it('should handle case-sensitive task ID routes correctly', async () => {
      const taskId = new mongoose.Types.ObjectId().toString();

      await request(server.server)
        .get(`/Tasks/${taskId}`)
        .expect(404);

      await request(server.server)
        .get(`/TASKS/${taskId}`)
        .expect(404);
    });
  });

  describe('Content Negotiation', () => {
    it('should return JSON by default', async () => {
      const response = await request(server.server)
        .post('/tasks')
        .send({ originalPath: MOCK_IMAGE_URL })
        .expect(201);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle Accept header for JSON', async () => {
      const response = await request(server.server)
        .post('/tasks')
        .set('Accept', 'application/json')
        .send({ originalPath: MOCK_IMAGE_URL })
        .expect(201);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
