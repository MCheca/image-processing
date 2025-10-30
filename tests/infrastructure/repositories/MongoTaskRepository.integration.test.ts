import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { MongoTaskRepository } from '../../../src/infrastructure/repositories/MongoTaskRepository';
import { Task } from '../../../src/domain/entities/Task';
import { TaskStatus } from '../../../src/domain/value-objects/TaskStatus';
import { Price } from '../../../src/domain/value-objects/Price';

describe('MongoTaskRepository - Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let repository: MongoTaskRepository;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect mongoose to the in-memory database
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Disconnect and stop the in-memory MongoDB server
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Create a new repository instance for each test
    repository = new MongoTaskRepository();
  });

  describe('save', () => {
    it('should save a new task to MongoDB', async () => {
      const task = Task.create('/input/test-image.jpg');

      const savedTask = await repository.save(task);

      expect(savedTask).toBeDefined();
      expect(savedTask.id).toBe(task.id);
      expect(savedTask.status.value).toBe('pending');
      expect(savedTask.originalPath).toBe('/input/test-image.jpg');
      expect(savedTask.price.value).toBeGreaterThanOrEqual(5);
      expect(savedTask.price.value).toBeLessThanOrEqual(50);
      expect(savedTask.images).toHaveLength(0);
      expect(savedTask.createdAt).toBeInstanceOf(Date);
      expect(savedTask.updatedAt).toBeInstanceOf(Date);
    });

    it('should save a completed task with images', async () => {
      const task = Task.create('/input/test-image.jpg');
      const images = [
        { resolution: '1024', path: '/output/test/1024/abc123.jpg' },
        { resolution: '800', path: '/output/test/800/def456.jpg' },
      ];
      const completedTask = task.complete(images);

      const savedTask = await repository.save(completedTask);

      expect(savedTask).toBeDefined();
      expect(savedTask.id).toBe(completedTask.id);
      expect(savedTask.status.value).toBe('completed');
      expect(savedTask.images).toHaveLength(2);
      expect(savedTask.images[0]).toEqual({
        resolution: '1024',
        path: '/output/test/1024/abc123.jpg',
      });
      expect(savedTask.images[1]).toEqual({
        resolution: '800',
        path: '/output/test/800/def456.jpg',
      });
    });

    it('should save a failed task with error message', async () => {
      const task = Task.create('/input/test-image.jpg');
      const failedTask = task.fail('Image processing failed: file not found');

      const savedTask = await repository.save(failedTask);

      expect(savedTask).toBeDefined();
      expect(savedTask.id).toBe(failedTask.id);
      expect(savedTask.status.value).toBe('failed');
      expect(savedTask.errorMessage).toBe('Image processing failed: file not found');
    });

    it('should update an existing task when saved again', async () => {
      const task = Task.create('/input/test-image.jpg');
      await repository.save(task);

      const images = [
        { resolution: '1024', path: '/output/test/1024/abc123.jpg' },
      ];
      const updatedTask = task.complete(images);

      const savedTask = await repository.save(updatedTask);

      expect(savedTask).toBeDefined();
      expect(savedTask.id).toBe(task.id);
      expect(savedTask.status.value).toBe('completed');
      expect(savedTask.images).toHaveLength(1);

      // Verify only one document exists in the database
      const allTasks = await mongoose.connection.db
        .collection('tasks')
        .find({})
        .toArray();
      expect(allTasks).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should find a task by id', async () => {
      const task = Task.create('/input/test-image.jpg');
      await repository.save(task);

      const foundTask = await repository.findById(task.id);

      expect(foundTask).toBeDefined();
      expect(foundTask).not.toBeNull();
      expect(foundTask!.id).toBe(task.id);
      expect(foundTask!.status.value).toBe('pending');
      expect(foundTask!.originalPath).toBe('/input/test-image.jpg');
      expect(foundTask!.price.value).toBe(task.price.value);
    });

    it('should return null when task is not found', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';

      const foundTask = await repository.findById(nonExistentId);

      expect(foundTask).toBeNull();
    });

    it('should find a completed task with images', async () => {
      const task = Task.create('/input/test-image.jpg');
      const images = [
        { resolution: '1024', path: '/output/test/1024/abc123.jpg' },
        { resolution: '800', path: '/output/test/800/def456.jpg' },
      ];
      const completedTask = task.complete(images);
      await repository.save(completedTask);

      const foundTask = await repository.findById(completedTask.id);

      expect(foundTask).toBeDefined();
      expect(foundTask).not.toBeNull();
      expect(foundTask!.status.value).toBe('completed');
      expect(foundTask!.images).toHaveLength(2);
      expect(foundTask!.images).toEqual(images);
    });

    it('should find a failed task with error message', async () => {
      const task = Task.create('/input/test-image.jpg');
      const failedTask = task.fail('Processing error');
      await repository.save(failedTask);

      const foundTask = await repository.findById(failedTask.id);

      expect(foundTask).toBeDefined();
      expect(foundTask).not.toBeNull();
      expect(foundTask!.status.value).toBe('failed');
      expect(foundTask!.errorMessage).toBe('Processing error');
    });
  });

  describe('data persistence and consistency', () => {
    it('should maintain data consistency across save and find operations', async () => {
      const originalTask = Task.create('/input/consistency-test.jpg');
      const originalPrice = originalTask.price.value;

      await repository.save(originalTask);
      const retrievedTask = await repository.findById(originalTask.id);

      expect(retrievedTask).toBeDefined();
      expect(retrievedTask!.id).toBe(originalTask.id);
      expect(retrievedTask!.status.value).toBe(originalTask.status.value);
      expect(retrievedTask!.price.value).toBe(originalPrice);
      expect(retrievedTask!.originalPath).toBe(originalTask.originalPath);
      // Allow for small timestamp differences due to MongoDB precision (within 10ms)
      expect(Math.abs(retrievedTask!.createdAt.getTime() - originalTask.createdAt.getTime())).toBeLessThan(10);
      expect(Math.abs(retrievedTask!.updatedAt.getTime() - originalTask.updatedAt.getTime())).toBeLessThan(10);
    });

    it('should correctly persist and retrieve task state transitions', async () => {
      const task = Task.create('/input/state-transition.jpg');

      await repository.save(task);
      let retrievedTask = await repository.findById(task.id);
      expect(retrievedTask!.status.value).toBe('pending');

      const images = [{ resolution: '1024', path: '/output/test.jpg' }];
      const completedTask = task.complete(images);
      await repository.save(completedTask);
      retrievedTask = await repository.findById(task.id);
      expect(retrievedTask!.status.value).toBe('completed');
      expect(retrievedTask!.images).toHaveLength(1);
    });

    it('should update updatedAt timestamp when task is modified', async () => {
      const task = Task.create('/input/timestamp-test.jpg');
      await repository.save(task);
      const initialUpdatedAt = task.updatedAt.getTime();

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const images = [{ resolution: '1024', path: '/output/test.jpg' }];
      const completedTask = task.complete(images);
      await repository.save(completedTask);

      const retrievedTask = await repository.findById(task.id);
      expect(retrievedTask).toBeDefined();
      expect(retrievedTask!.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt);
      // Allow for small timestamp differences due to MongoDB precision (within 10ms)
      expect(Math.abs(retrievedTask!.createdAt.getTime() - task.createdAt.getTime())).toBeLessThan(10);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully on save', async () => {
      const task = Task.create('/input/test.jpg');
      await mongoose.disconnect();

      await expect(repository.save(task)).rejects.toThrow();

      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    });

    it('should handle database connection errors gracefully on findById', async () => {
      const task = Task.create('/input/test.jpg');
      await repository.save(task);
      await mongoose.disconnect();

      await expect(repository.findById(task.id)).rejects.toThrow();

      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    });
  });
});
