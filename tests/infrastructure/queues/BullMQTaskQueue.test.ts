import { Queue } from 'bullmq';
import { BullMQTaskQueue } from '../../../src/infrastructure/queues/BullMQTaskQueue';

// Mock BullMQ
jest.mock('bullmq');

describe('BullMQTaskQueue', () => {
  let mockQueue: jest.Mocked<Queue>;
  let taskQueue: BullMQTaskQueue;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock queue instance
    mockQueue = {
      add: jest.fn(),
      close: jest.fn(),
    } as any;

    // Mock Queue constructor
    (Queue as jest.MockedClass<typeof Queue>).mockImplementation(() => mockQueue);

    // Create task queue instance
    taskQueue = new BullMQTaskQueue({
      host: 'localhost',
      port: 6379,
    });
  });

  afterEach(async () => {
    if (taskQueue) {
      await taskQueue.close();
    }
  });

  describe('Queue initialization', () => {
    it('should create a Queue instance with correct configuration', () => {
      expect(Queue).toHaveBeenCalledWith(
        'image-processing',
        expect.objectContaining({
          connection: {
            host: 'localhost',
            port: 6379,
          },
        })
      );
    });

    it('should configure queue with Redis password if provided', () => {
      const queueWithPassword = new BullMQTaskQueue({
        host: 'localhost',
        port: 6379,
        password: 'secret',
      });

      expect(Queue).toHaveBeenCalledWith(
        'image-processing',
        expect.objectContaining({
          connection: expect.objectContaining({
            password: 'secret',
          }),
        })
      );
    });

    it('should configure default job options with retry strategy', () => {
      expect(Queue).toHaveBeenCalledWith(
        'image-processing',
        expect.objectContaining({
          defaultJobOptions: expect.objectContaining({
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: expect.any(Number),
            },
          }),
        })
      );
    });
  });

  describe('Job enqueueing with different input types', () => {
    beforeEach(() => {
      mockQueue.add.mockResolvedValue({ id: 'job-123' } as any);
    });

    it('should add job with Buffer image source', async () => {
      const taskId = 'task-123';
      const imageBuffer = Buffer.from('fake-image-data');
      const filename = 'test-image.jpg';

      await taskQueue.addTask(taskId, imageBuffer, filename);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'processImage',
        expect.objectContaining({
          taskId: 'task-123',
          imageSource: {
            type: 'buffer',
            data: imageBuffer.toString('base64'),
          },
          filename: 'test-image.jpg',
        })
      );
    });

    it('should add job with string URL source', async () => {
      const taskId = 'task-url';
      const imageUrl = 'https://example.com/image.jpg';

      await taskQueue.addTask(taskId, imageUrl);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'processImage',
        expect.objectContaining({
          taskId: 'task-url',
          imageSource: {
            type: 'url',
            url: 'https://example.com/image.jpg',
          },
        })
      );
    });

    it('should handle file path string', async () => {
      const taskId = 'task-path';
      const filePath = '/path/to/local/image.png';

      await taskQueue.addTask(taskId, filePath);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'processImage',
        expect.objectContaining({
          imageSource: {
            type: 'url',
            url: '/path/to/local/image.png',
          },
        })
      );
    });
  });

  describe('Job data serialization', () => {
    beforeEach(() => {
      mockQueue.add.mockResolvedValue({ id: 'job-123' } as any);
    });

    it('should serialize Buffer to base64 string', async () => {
      const taskId = 'task-serialize';
      const imageBuffer = Buffer.from('test-data', 'utf-8');

      await taskQueue.addTask(taskId, imageBuffer);

      const callArgs = mockQueue.add.mock.calls[0][1];
      expect(callArgs.imageSource.type).toBe('buffer');
      expect(callArgs.imageSource.data).toBe(imageBuffer.toString('base64'));
      expect(typeof callArgs.imageSource.data).toBe('string');
    });

    it('should maintain data integrity through serialization', async () => {
      const taskId = 'integrity-test';
      const originalData = Buffer.from('test data with special chars: 你好 🎨');

      await taskQueue.addTask(taskId, originalData);

      const serializedData = mockQueue.add.mock.calls[0][1].imageSource.data;
      const deserializedData = Buffer.from(serializedData, 'base64');

      expect(deserializedData.equals(originalData)).toBe(true);
    });

    it('should properly structure job data', async () => {
      const taskId = 'structure-test';
      const url = 'https://example.com/test.jpg';

      await taskQueue.addTask(taskId, url, 'test.jpg');

      const jobData = mockQueue.add.mock.calls[0][1];

      expect(jobData).toEqual({
        taskId: 'structure-test',
        imageSource: {
          type: 'url',
          url: 'https://example.com/test.jpg',
        },
        filename: 'test.jpg',
      });
    });
  });

  describe('Error handling on job add', () => {
    it('should propagate error when queue.add fails', async () => {
      const taskId = 'error-task';
      const buffer = Buffer.from('data');
      const error = new Error('Redis connection failed');

      mockQueue.add.mockRejectedValue(error);

      await expect(taskQueue.addTask(taskId, buffer)).rejects.toThrow(
        'Redis connection failed'
      );
    });

    it('should handle network errors gracefully', async () => {
      const taskId = 'network-error-task';
      const url = 'https://example.com/image.jpg';
      const networkError = new Error('ECONNREFUSED');

      mockQueue.add.mockRejectedValue(networkError);

      await expect(taskQueue.addTask(taskId, url)).rejects.toThrow('ECONNREFUSED');
    });

    it('should throw error for invalid inputs', async () => {
      const invalidTaskId = '';
      const buffer = Buffer.from('data');

      await expect(taskQueue.addTask(invalidTaskId, buffer)).rejects.toThrow();
    });

    it('should throw error for null or undefined imageSource', async () => {
      const taskId = 'task-invalid';

      await expect(taskQueue.addTask(taskId, null as any)).rejects.toThrow();
      await expect(taskQueue.addTask(taskId, undefined as any)).rejects.toThrow();
    });
  });

  describe('Queue connection management', () => {
    it('should close queue connection', async () => {
      mockQueue.close.mockResolvedValue();

      await taskQueue.close();

      expect(mockQueue.close).toHaveBeenCalledTimes(1);
    });

    it('should handle close errors gracefully', async () => {
      const closeError = new Error('Failed to close connection');
      mockQueue.close.mockRejectedValue(closeError);

      await expect(taskQueue.close()).rejects.toThrow('Failed to close connection');
    });

    it('should not accept jobs after close', async () => {
      mockQueue.close.mockResolvedValue();
      await taskQueue.close();

      const error = new Error('Queue is closed');
      mockQueue.add.mockRejectedValue(error);

      await expect(
        taskQueue.addTask('task-after-close', Buffer.from('data'))
      ).rejects.toThrow('Queue is closed');
    });
  });
});
