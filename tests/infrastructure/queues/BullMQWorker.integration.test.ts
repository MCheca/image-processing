import { Worker } from 'bullmq';
import { BullMQWorker } from '../../../src/infrastructure/queues/BullMQWorker';
import { ProcessImageUseCase } from '../../../src/application/use-cases/ProcessImageUseCase';

// Mock BullMQ Worker
jest.mock('bullmq');

describe('BullMQWorker Integration', () => {
  let mockWorker: jest.Mocked<Worker>;
  let mockProcessImageUseCase: jest.Mocked<ProcessImageUseCase>;
  let bullMQWorker: BullMQWorker;
  let jobProcessor: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ProcessImageUseCase
    mockProcessImageUseCase = {
      execute: jest.fn(),
    } as any;

    // Mock Worker instance
    mockWorker = {
      on: jest.fn(),
      close: jest.fn(),
      run: jest.fn(),
    } as any;

    // Capture the job processor function when Worker is constructed
    (Worker as jest.MockedClass<typeof Worker>).mockImplementation((queueName, processor) => {
      jobProcessor = processor;
      return mockWorker;
    });

    // Create worker instance
    bullMQWorker = new BullMQWorker(
      {
        host: 'localhost',
        port: 6379,
      },
      mockProcessImageUseCase
    );
  });

  afterEach(async () => {
    if (bullMQWorker) {
      mockWorker.close.mockResolvedValue();
      await bullMQWorker.close().catch(() => {
        // Ignore cleanup errors
      });
    }
  });

  describe('Worker processes jobs successfully', () => {
    it('should process job with Buffer image source', async () => {
      const jobData = {
        taskId: 'task-123',
        imageSource: {
          type: 'buffer',
          data: Buffer.from('fake-image').toString('base64'),
        },
        filename: 'test.jpg',
      };

      const mockJob = {
        id: 'job-123',
        name: 'processImage',
        data: jobData,
      };

      mockProcessImageUseCase.execute.mockResolvedValue({
        taskId: 'task-123',
        status: 'completed',
        images: [
          { resolution: '1024', path: '/output/test/1024/image.jpg' },
          { resolution: '800', path: '/output/test/800/image.jpg' },
        ],
      });

      await jobProcessor(mockJob);

      expect(mockProcessImageUseCase.execute).toHaveBeenCalledWith({
        taskId: 'task-123',
        imageSource: expect.any(Buffer),
        filename: 'test.jpg',
      });

      // Verify Buffer was deserialized correctly
      const calledBuffer = mockProcessImageUseCase.execute.mock.calls[0][0].imageSource;
      expect(Buffer.isBuffer(calledBuffer)).toBe(true);
      expect(calledBuffer.toString()).toBe('fake-image');
    });

    it('should process job with URL image source', async () => {
      const jobData = {
        taskId: 'task-456',
        imageSource: {
          type: 'url',
          url: 'https://example.com/image.jpg',
        },
      };

      const mockJob = {
        id: 'job-456',
        name: 'processImage',
        data: jobData,
      };

      mockProcessImageUseCase.execute.mockResolvedValue({
        taskId: 'task-456',
        status: 'completed',
        images: [],
      });

      await jobProcessor(mockJob);

      expect(mockProcessImageUseCase.execute).toHaveBeenCalledWith({
        taskId: 'task-456',
        imageSource: 'https://example.com/image.jpg',
        filename: undefined,
      });
    });

    it('should pass filename to ProcessImageUseCase when provided', async () => {
      const jobData = {
        taskId: 'task-789',
        imageSource: {
          type: 'url',
          url: '/path/to/image.png',
        },
        filename: 'custom-filename.png',
      };

      const mockJob = {
        id: 'job-789',
        name: 'processImage',
        data: jobData,
      };

      mockProcessImageUseCase.execute.mockResolvedValue({
        taskId: 'task-789',
        status: 'completed',
        images: [],
      });

      await jobProcessor(mockJob);

      expect(mockProcessImageUseCase.execute).toHaveBeenCalledWith({
        taskId: 'task-789',
        imageSource: '/path/to/image.png',
        filename: 'custom-filename.png',
      });
    });
  });

  describe('Worker handles ProcessImageUseCase errors', () => {
    it('should propagate errors from ProcessImageUseCase', async () => {
      const jobData = {
        taskId: 'task-error',
        imageSource: {
          type: 'buffer',
          data: Buffer.from('data').toString('base64'),
        },
      };

      const mockJob = {
        id: 'job-error',
        name: 'processImage',
        data: jobData,
      };

      const error = new Error('Image processing failed');
      mockProcessImageUseCase.execute.mockRejectedValue(error);

      await expect(jobProcessor(mockJob)).rejects.toThrow('Image processing failed');
    });

    it('should handle task not found errors', async () => {
      const jobData = {
        taskId: 'non-existent-task',
        imageSource: {
          type: 'url',
          url: 'https://example.com/image.jpg',
        },
      };

      const mockJob = {
        id: 'job-not-found',
        name: 'processImage',
        data: jobData,
      };

      const error = new Error('Task not found: non-existent-task');
      mockProcessImageUseCase.execute.mockRejectedValue(error);

      await expect(jobProcessor(mockJob)).rejects.toThrow('Task not found');
    });

    it('should handle invalid image data errors', async () => {
      const jobData = {
        taskId: 'task-invalid',
        imageSource: {
          type: 'buffer',
          data: 'invalid-base64!!!',
        },
      };

      const mockJob = {
        id: 'job-invalid',
        name: 'processImage',
        data: jobData,
      };

      const error = new Error('Invalid image data');
      mockProcessImageUseCase.execute.mockRejectedValue(error);

      await expect(jobProcessor(mockJob)).rejects.toThrow('Invalid image data');
    });
  });

  describe('Worker retry behavior on failure', () => {
    it('should allow job to be retried on failure', async () => {
      const jobData = {
        taskId: 'task-retry',
        imageSource: {
          type: 'url',
          url: 'https://example.com/image.jpg',
        },
      };

      const mockJob = {
        id: 'job-retry',
        name: 'processImage',
        data: jobData,
        attemptsMade: 1,
      };

      // First attempt fails
      mockProcessImageUseCase.execute.mockRejectedValueOnce(
        new Error('Temporary network error')
      );

      await expect(jobProcessor(mockJob)).rejects.toThrow('Temporary network error');

      // Second attempt succeeds
      mockProcessImageUseCase.execute.mockResolvedValueOnce({
        taskId: 'task-retry',
        status: 'completed',
        images: [],
      });

      mockJob.attemptsMade = 2;
      await expect(jobProcessor(mockJob)).resolves.not.toThrow();
    });

    it('should fail after max retries', async () => {
      const jobData = {
        taskId: 'task-max-retry',
        imageSource: {
          type: 'url',
          url: 'https://example.com/image.jpg',
        },
      };

      const mockJob = {
        id: 'job-max-retry',
        name: 'processImage',
        data: jobData,
        attemptsMade: 3,
      };

      mockProcessImageUseCase.execute.mockRejectedValue(
        new Error('Permanent failure')
      );

      await expect(jobProcessor(mockJob)).rejects.toThrow('Permanent failure');
    });
  });

  describe('Worker graceful shutdown', () => {
    it('should close worker connection gracefully', async () => {
      mockWorker.close.mockResolvedValue();

      await bullMQWorker.close();

      expect(mockWorker.close).toHaveBeenCalledTimes(1);
    });

    it('should handle close errors', async () => {
      const closeError = new Error('Failed to close worker');
      mockWorker.close.mockRejectedValue(closeError);

      await expect(bullMQWorker.close()).rejects.toThrow('Failed to close worker');
    });

    it('should allow multiple close calls', async () => {
      mockWorker.close.mockResolvedValue();

      await bullMQWorker.close();
      await bullMQWorker.close();

      expect(mockWorker.close).toHaveBeenCalledTimes(2);
    });
  });

  describe('Worker configuration', () => {
    it('should configure worker with correct Redis connection', () => {
      expect(Worker).toHaveBeenCalledWith(
        'image-processing',
        expect.any(Function),
        expect.objectContaining({
          connection: {
            host: 'localhost',
            port: 6379,
          },
        })
      );
    });

    it('should configure worker with Redis password if provided', () => {
      const workerWithPassword = new BullMQWorker(
        {
          host: 'localhost',
          port: 6379,
          password: 'secret',
        },
        mockProcessImageUseCase
      );

      expect(Worker).toHaveBeenCalledWith(
        'image-processing',
        expect.any(Function),
        expect.objectContaining({
          connection: expect.objectContaining({
            password: 'secret',
          }),
        })
      );
    });

    it('should configure worker with concurrency settings', () => {
      const workerWithConcurrency = new BullMQWorker(
        {
          host: 'localhost',
          port: 6379,
        },
        mockProcessImageUseCase,
        { concurrency: 5 }
      );

      expect(Worker).toHaveBeenCalledWith(
        'image-processing',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 5,
        })
      );
    });
  });
});
