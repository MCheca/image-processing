import { Task } from '../../../src/domain/entities/Task';
import { TaskStatus } from '../../../src/domain/value-objects/TaskStatus';
import { Price } from '../../../src/domain/value-objects/Price';

describe('Task Entity', () => {
  describe('creation', () => {
    it('should create a new Task with pending status', () => {
      const originalPath = '/input/image1.jpg';
      const task = Task.create(originalPath);

      expect(task.id).toBeDefined();
      expect(task.status.isPending()).toBe(true);
      expect(task.price).toBeInstanceOf(Price);
      expect(task.price.value).toBeGreaterThanOrEqual(5);
      expect(task.price.value).toBeLessThanOrEqual(50);
      expect(task.originalPath).toBe(originalPath);
      expect(task.images).toEqual([]);
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('should create different IDs for different tasks', () => {
      const task1 = Task.create('/input/image1.jpg');
      const task2 = Task.create('/input/image2.jpg');

      expect(task1.id).not.toBe(task2.id);
    });

    it('should create with same createdAt and updatedAt initially', () => {
      const task = Task.create('/input/image1.jpg');

      expect(task.createdAt.getTime()).toBe(task.updatedAt.getTime());
    });

    it('should throw error when originalPath is empty', () => {
      expect(() => Task.create('')).toThrow('Original path cannot be empty');
    });

    it('should throw error when originalPath is only whitespace', () => {
      expect(() => Task.create('   ')).toThrow('Original path cannot be empty');
    });
  });

  describe('status transitions', () => {
    it('should complete a task with images', () => {
      const task = Task.create('/input/image1.jpg');
      const images = [
        { resolution: '1024', path: '/output/image1/1024/hash.jpg' },
        { resolution: '800', path: '/output/image1/800/hash.jpg' },
      ];

      const completedTask = task.complete(images);

      expect(completedTask.status.isCompleted()).toBe(true);
      expect(completedTask.images).toEqual(images);
      expect(completedTask.updatedAt.getTime()).toBeGreaterThan(task.updatedAt.getTime());
    });

    it('should throw error when completing without images', () => {
      const task = Task.create('/input/image1.jpg');

      expect(() => task.complete([])).toThrow('Cannot complete task without images');
    });

    it('should fail a task', () => {
      const task = Task.create('/input/image1.jpg');
      const errorMessage = 'Failed to process image';

      const failedTask = task.fail(errorMessage);

      expect(failedTask.status.isFailed()).toBe(true);
      expect(failedTask.errorMessage).toBe(errorMessage);
      expect(failedTask.images).toEqual([]);
      expect(failedTask.updatedAt.getTime()).toBeGreaterThan(task.updatedAt.getTime());
    });

    it('should throw error when failing without error message', () => {
      const task = Task.create('/input/image1.jpg');

      expect(() => task.fail('')).toThrow('Error message cannot be empty');
    });

    it('should throw error when transitioning from completed to failed', () => {
      const task = Task.create('/input/image1.jpg');
      const images = [{ resolution: '1024', path: '/output/image1/1024/hash.jpg' }];
      const completedTask = task.complete(images);

      expect(() => completedTask.fail('Error')).toThrow();
    });

    it('should throw error when completing an already completed task', () => {
      const task = Task.create('/input/image1.jpg');
      const images = [{ resolution: '1024', path: '/output/image1/1024/hash.jpg' }];
      const completedTask = task.complete(images);

      expect(() => completedTask.complete(images)).toThrow();
    });

    it('should throw error when completing a failed task', () => {
      const task = Task.create('/input/image1.jpg');
      const failedTask = task.fail('Error');
      const images = [{ resolution: '1024', path: '/output/image1/1024/hash.jpg' }];

      expect(() => failedTask.complete(images)).toThrow();
    });
  });

  describe('reconstitution from persistence', () => {
    it('should reconstitute a pending task from stored data', () => {
      const id = '65d4a54b89c5e342b2c2c5f6';
      const status = TaskStatus.createPending();
      const price = Price.createRandom();
      const createdAt = new Date('2024-06-01T12:00:00Z');
      const updatedAt = new Date('2024-06-01T12:00:00Z');
      const originalPath = '/input/image1.jpg';

      const task = Task.reconstitute(id, status, price, createdAt, updatedAt, originalPath, []);

      expect(task.id).toBe(id);
      expect(task.status).toBe(status);
      expect(task.price).toBe(price);
      expect(task.createdAt).toBe(createdAt);
      expect(task.updatedAt).toBe(updatedAt);
      expect(task.originalPath).toBe(originalPath);
      expect(task.images).toEqual([]);
      expect(task.errorMessage).toBeUndefined();
    });

    it('should reconstitute a completed task from stored data', () => {
      const id = '65d4a54b89c5e342b2c2c5f6';
      const status = TaskStatus.createCompleted();
      const price = Price.createRandom();
      const createdAt = new Date('2024-06-01T12:00:00Z');
      const updatedAt = new Date('2024-06-01T12:10:00Z');
      const originalPath = '/input/image1.jpg';
      const images = [
        { resolution: '1024', path: '/output/image1/1024/hash.jpg' },
        { resolution: '800', path: '/output/image1/800/hash.jpg' },
      ];

      const task = Task.reconstitute(id, status, price, createdAt, updatedAt, originalPath, images);

      expect(task.id).toBe(id);
      expect(task.status.isCompleted()).toBe(true);
      expect(task.images).toEqual(images);
    });

    it('should reconstitute a failed task from stored data', () => {
      const id = '65d4a54b89c5e342b2c2c5f6';
      const status = TaskStatus.createFailed();
      const price = Price.createRandom();
      const createdAt = new Date('2024-06-01T12:00:00Z');
      const updatedAt = new Date('2024-06-01T12:05:00Z');
      const originalPath = '/input/image1.jpg';
      const errorMessage = 'Failed to process image';

      const task = Task.reconstitute(
        id,
        status,
        price,
        createdAt,
        updatedAt,
        originalPath,
        [],
        errorMessage
      );

      expect(task.id).toBe(id);
      expect(task.status.isFailed()).toBe(true);
      expect(task.errorMessage).toBe(errorMessage);
    });
  });

  describe('image validation', () => {
    it('should validate image structure has resolution and path', () => {
      const task = Task.create('/input/image1.jpg');
      const invalidImages = [{ resolution: '1024' }] as any;

      expect(() => task.complete(invalidImages)).toThrow('Invalid image structure');
    });

    it('should validate resolution is not empty', () => {
      const task = Task.create('/input/image1.jpg');
      const invalidImages = [{ resolution: '', path: '/output/image1/1024/hash.jpg' }];

      expect(() => task.complete(invalidImages)).toThrow('Image resolution cannot be empty');
    });

    it('should validate path is not empty', () => {
      const task = Task.create('/input/image1.jpg');
      const invalidImages = [{ resolution: '1024', path: '' }];

      expect(() => task.complete(invalidImages)).toThrow('Image path cannot be empty');
    });
  });

  describe('immutability', () => {
    it('should return new instance when completing', () => {
      const original = Task.create('/input/image1.jpg');
      const images = [{ resolution: '1024', path: '/output/image1/1024/hash.jpg' }];
      const completed = original.complete(images);

      expect(original).not.toBe(completed);
      expect(original.status.isPending()).toBe(true);
      expect(completed.status.isCompleted()).toBe(true);
    });

    it('should return new instance when failing', () => {
      const original = Task.create('/input/image1.jpg');
      const failed = original.fail('Error');

      expect(original).not.toBe(failed);
      expect(original.status.isPending()).toBe(true);
      expect(failed.status.isFailed()).toBe(true);
    });

    it('should not allow mutation of images array', () => {
      const task = Task.create('/input/image1.jpg');
      const images = [{ resolution: '1024', path: '/output/image1/1024/hash.jpg' }];
      const completed = task.complete(images);

      // Try to modify the images array
      images.push({ resolution: '800', path: '/output/image1/800/hash.jpg' });

      expect(completed.images.length).toBe(1);
    });
  });

  describe('serialization', () => {
    it('should convert to plain object for persistence', () => {
      const task = Task.create('/input/image1.jpg');
      const plainObject = task.toObject();

      expect(plainObject).toEqual({
        id: task.id,
        status: task.status.value,
        price: task.price.value,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        originalPath: task.originalPath,
        images: [],
      });
    });

    it('should include images when completed', () => {
      const task = Task.create('/input/image1.jpg');
      const images = [
        { resolution: '1024', path: '/output/image1/1024/hash.jpg' },
        { resolution: '800', path: '/output/image1/800/hash.jpg' },
      ];
      const completed = task.complete(images);
      const plainObject = completed.toObject();

      expect(plainObject.images).toEqual(images);
      expect(plainObject.status).toBe('completed');
    });

    it('should include error message when failed', () => {
      const task = Task.create('/input/image1.jpg');
      const failed = task.fail('Processing error');
      const plainObject = failed.toObject();

      expect(plainObject.errorMessage).toBe('Processing error');
      expect(plainObject.status).toBe('failed');
    });
  });
});
