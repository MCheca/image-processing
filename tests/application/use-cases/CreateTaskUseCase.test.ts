import { Task } from '../../../src/domain/entities/Task';
import { TaskRepository } from '../../../src/domain/repositories/TaskRepository';
import { ITaskQueue } from '../../../src/domain/services/ITaskQueue';
import { CreateTaskUseCase, CreateTaskInput } from '../../../src/application/use-cases/CreateTaskUseCase';

// Mock Repository
class MockTaskRepository implements TaskRepository {
  private tasks: Map<string, Task> = new Map();
  public saveCalled = false;
  public lastSavedTask: Task | null = null;
  public shouldFailOnSave = false;

  async save(task: Task): Promise<Task> {
    this.saveCalled = true;
    this.lastSavedTask = task;

    if (this.shouldFailOnSave) {
      throw new Error('Database error: Failed to save task');
    }

    this.tasks.set(task.id, task);
    return task;
  }

  async findById(id: string): Promise<Task | null> {
    return this.tasks.get(id) || null;
  }

  reset(): void {
    this.tasks.clear();
    this.saveCalled = false;
    this.lastSavedTask = null;
    this.shouldFailOnSave = false;
  }
}

// Mock Task Queue
class MockTaskQueue implements ITaskQueue {
  public addTaskCalled = false;
  public lastTaskId: string | null = null;
  public lastImageSource: string | Buffer | null = null;
  public lastFilename: string | null = null;
  public shouldFailOnAdd = false;

  async addTask(taskId: string, imageSource: string | Buffer, filename?: string): Promise<void> {
    this.addTaskCalled = true;
    this.lastTaskId = taskId;
    this.lastImageSource = imageSource;
    this.lastFilename = filename || null;

    if (this.shouldFailOnAdd) {
      throw new Error('Queue error: Failed to add task');
    }
  }

  reset(): void {
    this.addTaskCalled = false;
    this.lastTaskId = null;
    this.lastImageSource = null;
    this.lastFilename = null;
    this.shouldFailOnAdd = false;
  }
}

describe('CreateTaskUseCase', () => {
  let createTaskUseCase: CreateTaskUseCase;
  let mockRepository: MockTaskRepository;
  let mockQueue: MockTaskQueue;

  beforeEach(() => {
    mockRepository = new MockTaskRepository();
    mockQueue = new MockTaskQueue();
    createTaskUseCase = new CreateTaskUseCase(mockRepository, mockQueue);
  });

  afterEach(() => {
    mockRepository.reset();
    mockQueue.reset();
  });

  describe('successful task creation', () => {
    it('should create a new task with pending status', async () => {
      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      const output = await createTaskUseCase.execute(input);

      expect(output).toBeDefined();
      expect(output.taskId).toBeDefined();
      expect(typeof output.taskId).toBe('string');
      expect(output.status).toBe('pending');
      expect(output.price).toBeGreaterThanOrEqual(5);
      expect(output.price).toBeLessThanOrEqual(50);
    });

    it('should generate a unique taskId using UUID format', async () => {
      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      const output = await createTaskUseCase.execute(input);

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(output.taskId).toMatch(uuidRegex);
    });

    it('should assign a random price between 5 and 50', async () => {
      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      const output = await createTaskUseCase.execute(input);

      expect(output.price).toBeGreaterThanOrEqual(5);
      expect(output.price).toBeLessThanOrEqual(50);
      expect(typeof output.price).toBe('number');
    });

    it('should save the task to the repository', async () => {
      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      await createTaskUseCase.execute(input);

      expect(mockRepository.saveCalled).toBe(true);
      expect(mockRepository.lastSavedTask).not.toBeNull();
    });

    it('should save a task with correct properties', async () => {
      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      await createTaskUseCase.execute(input);

      const savedTask = mockRepository.lastSavedTask!;
      expect(savedTask).toBeInstanceOf(Task);
      expect(savedTask.status.isPending()).toBe(true);
      expect(savedTask.originalPath).toBe(input.originalPath);
      expect(savedTask.images).toEqual([]);
      expect(savedTask.errorMessage).toBeUndefined();
    });

    it('should create tasks with different IDs on multiple calls', async () => {
      const input1: CreateTaskInput = { originalPath: '/input/image1.jpg' };
      const input2: CreateTaskInput = { originalPath: '/input/image2.jpg' };

      const output1 = await createTaskUseCase.execute(input1);
      const output2 = await createTaskUseCase.execute(input2);

      expect(output1.taskId).not.toBe(output2.taskId);
    });
  });

  describe('input validation', () => {
    it('should reject empty original path', async () => {
      const input: CreateTaskInput = {
        originalPath: '',
      };

      await expect(createTaskUseCase.execute(input)).rejects.toThrow(
        'Original path cannot be empty'
      );
    });

    it('should reject whitespace-only original path', async () => {
      const input: CreateTaskInput = {
        originalPath: '   ',
      };

      await expect(createTaskUseCase.execute(input)).rejects.toThrow(
        'Original path cannot be empty'
      );
    });

    it('should trim whitespace from original path', async () => {
      const input: CreateTaskInput = {
        originalPath: '  /input/test-image.jpg  ',
      };

      await createTaskUseCase.execute(input);

      const savedTask = mockRepository.lastSavedTask!;
      expect(savedTask.originalPath).toBe('/input/test-image.jpg');
    });

    it('should reject null original path', async () => {
      const input: any = {
        originalPath: null,
      };

      await expect(createTaskUseCase.execute(input)).rejects.toThrow();
    });

    it('should reject undefined original path', async () => {
      const input: any = {
        originalPath: undefined,
      };

      await expect(createTaskUseCase.execute(input)).rejects.toThrow();
    });
  });

  describe('valid path formats', () => {
    it('should accept absolute file path', async () => {
      const input: CreateTaskInput = {
        originalPath: '/input/images/photo.jpg',
      };

      const output = await createTaskUseCase.execute(input);
      expect(output.taskId).toBeDefined();
    });

    it('should accept URL path', async () => {
      const input: CreateTaskInput = {
        originalPath: 'https://example.com/images/photo.jpg',
      };

      const output = await createTaskUseCase.execute(input);
      expect(output.taskId).toBeDefined();
    });

    it('should accept Windows-style path', async () => {
      const input: CreateTaskInput = {
        originalPath: 'C:\\Users\\test\\images\\photo.jpg',
      };

      const output = await createTaskUseCase.execute(input);
      expect(output.taskId).toBeDefined();
    });

    it('should accept relative path', async () => {
      const input: CreateTaskInput = {
        originalPath: './images/photo.jpg',
      };

      const output = await createTaskUseCase.execute(input);
      expect(output.taskId).toBeDefined();
    });

    it('should accept path with special characters', async () => {
      const input: CreateTaskInput = {
        originalPath: '/input/my-image_2024 (1).jpg',
      };

      const output = await createTaskUseCase.execute(input);
      expect(output.taskId).toBeDefined();
    });
  });

  describe('repository interaction', () => {
    it('should handle repository save errors', async () => {
      mockRepository.shouldFailOnSave = true;

      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      await expect(createTaskUseCase.execute(input)).rejects.toThrow(
        'Database error: Failed to save task'
      );
    });

    it('should not return task if save fails', async () => {
      mockRepository.shouldFailOnSave = true;

      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      await expect(createTaskUseCase.execute(input)).rejects.toThrow();
      // Ensure the task is not retrievable if save failed
    });
  });

  describe('output format', () => {
    it('should return output with all required fields', async () => {
      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      const output = await createTaskUseCase.execute(input);

      expect(output).toHaveProperty('taskId');
      expect(output).toHaveProperty('status');
      expect(output).toHaveProperty('price');
    });

    it('should return status as string, not TaskStatus object', async () => {
      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      const output = await createTaskUseCase.execute(input);

      expect(typeof output.status).toBe('string');
      expect(output.status).toBe('pending');
    });

    it('should return price as number, not Price object', async () => {
      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      const output = await createTaskUseCase.execute(input);

      expect(typeof output.price).toBe('number');
    });

    it('should return price with at most 2 decimal places', async () => {
      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      const output = await createTaskUseCase.execute(input);

      const decimalPlaces = (output.price.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });

  describe('use case behavior', () => {
    it('should create new task on each execution with same input', async () => {
      const input1: CreateTaskInput = { originalPath: '/input/image1.jpg' };

      const output1 = await createTaskUseCase.execute(input1);
      const output2 = await createTaskUseCase.execute(input1);

      // Each call should create a new task, not return the same one
      expect(output1.taskId).not.toBe(output2.taskId);
    });

    it('should persist task so it can be retrieved', async () => {
      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      const output = await createTaskUseCase.execute(input);

      const retrievedTask = await mockRepository.findById(output.taskId);
      expect(retrievedTask).not.toBeNull();
      expect(retrievedTask!.id).toBe(output.taskId);
    });

    it('should create task with matching output values', async () => {
      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      const output = await createTaskUseCase.execute(input);
      const savedTask = await mockRepository.findById(output.taskId);

      expect(savedTask!.id).toBe(output.taskId);
      expect(savedTask!.status.value).toBe(output.status);
      expect(savedTask!.price.value).toBe(output.price);
    });
  });

  describe('edge cases', () => {
    it('should handle very long file paths', async () => {
      const longPath = '/input/' + 'a'.repeat(500) + '/image.jpg';
      const input: CreateTaskInput = {
        originalPath: longPath,
      };

      const output = await createTaskUseCase.execute(input);
      expect(output.taskId).toBeDefined();
    });

    it('should handle paths with unicode characters', async () => {
      const input: CreateTaskInput = {
        originalPath: '/input/图片/фото/صورة.jpg',
      };

      const output = await createTaskUseCase.execute(input);
      expect(output.taskId).toBeDefined();
    });

    it('should handle concurrent task creation', async () => {
      const inputs = Array.from({ length: 10 }, (_, i) => ({
        originalPath: `/input/image${i}.jpg`,
      }));

      const outputs = await Promise.all(inputs.map((input) => createTaskUseCase.execute(input)));

      // All should succeed
      expect(outputs).toHaveLength(10);

      // All should have unique IDs
      const ids = outputs.map((o) => o.taskId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });
  });

  describe('domain logic integration', () => {
    it('should delegate task creation to Task entity', async () => {
      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      await createTaskUseCase.execute(input);

      const savedTask = mockRepository.lastSavedTask!;
      // Verify task was created using Task.create logic
      expect(savedTask).toBeInstanceOf(Task);
      expect(savedTask.status.isPending()).toBe(true);
      expect(savedTask.createdAt).toBeInstanceOf(Date);
      expect(savedTask.updatedAt).toBeInstanceOf(Date);
    });

    it('should preserve domain invariants', async () => {
      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      await createTaskUseCase.execute(input);

      const savedTask = mockRepository.lastSavedTask!;
      // Verify domain invariants
      expect(savedTask.images).toEqual([]);
      expect(savedTask.createdAt.getTime()).toBe(savedTask.updatedAt.getTime());
      expect(savedTask.errorMessage).toBeUndefined();
    });
  });

  describe('URL image download', () => {
    it('should download image from URL before creating task', async () => {
      const mockDownloader = {
        downloadCalled: false,
        lastUrl: null as string | null,
        async downloadImage(url: string): Promise<{ buffer: Buffer; filename: string }> {
          this.downloadCalled = true;
          this.lastUrl = url;
          return {
            buffer: Buffer.from('fake-image-data'),
            filename: 'downloaded-image.jpg',
          };
        },
        isUrl(path: string): boolean {
          return path.startsWith('http://') || path.startsWith('https://');
        },
      };

      const useCaseWithDownloader = new CreateTaskUseCase(
        mockRepository,
        mockQueue,
        mockDownloader
      );

      const input: CreateTaskInput = {
        originalPath: 'https://example.com/test.jpg',
      };

      await useCaseWithDownloader.execute(input);

      expect(mockDownloader.downloadCalled).toBe(true);
      expect(mockDownloader.lastUrl).toBe('https://example.com/test.jpg');
    });

    it('should save task with original URL for URL input', async () => {
      const mockDownloader = {
        async downloadImage(_url: string): Promise<{ buffer: Buffer; filename: string }> {
          return {
            buffer: Buffer.from('fake-image-data'),
            filename: 'downloaded-image.jpg',
          };
        },
        isUrl(path: string): boolean {
          return path.startsWith('http://') || path.startsWith('https://');
        },
      };

      const useCaseWithDownloader = new CreateTaskUseCase(
        mockRepository,
        mockQueue,
        mockDownloader
      );

      const input: CreateTaskInput = {
        originalPath: 'https://example.com/test.jpg',
      };

      await useCaseWithDownloader.execute(input);

      const savedTask = mockRepository.lastSavedTask!;
      expect(savedTask.originalPath).toBe('https://example.com/test.jpg');
    });

    it('should pass buffer to queue for URL input', async () => {
      const fakeBuffer = Buffer.from('fake-image-data');
      const mockDownloader = {
        async downloadImage(_url: string): Promise<{ buffer: Buffer; filename: string }> {
          return {
            buffer: fakeBuffer,
            filename: 'test.jpg',
          };
        },
        isUrl(path: string): boolean {
          return path.startsWith('http://') || path.startsWith('https://');
        },
      };

      const useCaseWithDownloader = new CreateTaskUseCase(
        mockRepository,
        mockQueue,
        mockDownloader
      );

      const input: CreateTaskInput = {
        originalPath: 'https://example.com/test.jpg',
      };

      await useCaseWithDownloader.execute(input);

      expect(mockQueue.lastImageSource).toBe(fakeBuffer);
      expect(mockQueue.lastFilename).toBe('test.jpg');
    });

    it('should not download if input is a local path', async () => {
      const mockDownloader = {
        downloadCalled: false,
        async downloadImage(_url: string): Promise<{ buffer: Buffer; filename: string }> {
          this.downloadCalled = true;
          return {
            buffer: Buffer.from('fake-image-data'),
            filename: 'downloaded-image.jpg',
          };
        },
        isUrl(path: string): boolean {
          return path.startsWith('http://') || path.startsWith('https://');
        },
      };

      const useCaseWithDownloader = new CreateTaskUseCase(
        mockRepository,
        mockQueue,
        mockDownloader
      );

      const input: CreateTaskInput = {
        originalPath: '/input/local-image.jpg',
      };

      await useCaseWithDownloader.execute(input);

      expect(mockDownloader.downloadCalled).toBe(false);
    });

    it('should handle download errors gracefully', async () => {
      const mockDownloader = {
        async downloadImage(_url: string): Promise<{ buffer: Buffer; filename: string }> {
          throw new Error('Network error: Failed to download image');
        },
        isUrl(path: string): boolean {
          return path.startsWith('http://') || path.startsWith('https://');
        },
      };

      const useCaseWithDownloader = new CreateTaskUseCase(
        mockRepository,
        mockQueue,
        mockDownloader
      );

      const input: CreateTaskInput = {
        originalPath: 'https://example.com/test.jpg',
      };

      await expect(useCaseWithDownloader.execute(input)).rejects.toThrow(
        'Network error: Failed to download image'
      );
    });

    it('should support both http and https URLs', async () => {
      const mockDownloader = {
        downloadedUrls: [] as string[],
        async downloadImage(url: string): Promise<{ buffer: Buffer; filename: string }> {
          this.downloadedUrls.push(url);
          return {
            buffer: Buffer.from('fake-image-data'),
            filename: 'downloaded-image.jpg',
          };
        },
        isUrl(path: string): boolean {
          return path.startsWith('http://') || path.startsWith('https://');
        },
      };

      const useCaseWithDownloader = new CreateTaskUseCase(
        mockRepository,
        mockQueue,
        mockDownloader
      );

      const httpInput: CreateTaskInput = {
        originalPath: 'http://example.com/test.jpg',
      };
      await useCaseWithDownloader.execute(httpInput);

      const httpsInput: CreateTaskInput = {
        originalPath: 'https://example.com/test.jpg',
      };
      await useCaseWithDownloader.execute(httpsInput);

      expect(mockDownloader.downloadedUrls).toContain('http://example.com/test.jpg');
      expect(mockDownloader.downloadedUrls).toContain('https://example.com/test.jpg');
    });
  });

  describe('task queue integration', () => {
    it('should add task to queue after creation', async () => {
      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      await createTaskUseCase.execute(input);

      expect(mockQueue.addTaskCalled).toBe(true);
    });

    it('should pass correct taskId and imageSource to queue', async () => {
      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      const output = await createTaskUseCase.execute(input);

      expect(mockQueue.lastTaskId).toBe(output.taskId);
      expect(mockQueue.lastImageSource).toBe(input.originalPath);
    });

    it('should add task to queue only after saving to repository', async () => {
      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      await createTaskUseCase.execute(input);

      // Both should be called
      expect(mockRepository.saveCalled).toBe(true);
      expect(mockQueue.addTaskCalled).toBe(true);
    });

    it('should not add to queue if repository save fails', async () => {
      mockRepository.shouldFailOnSave = true;

      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      await expect(createTaskUseCase.execute(input)).rejects.toThrow();

      // Queue should not be called if save fails
      expect(mockQueue.addTaskCalled).toBe(false);
    });

    it('should propagate queue errors', async () => {
      mockQueue.shouldFailOnAdd = true;

      const input: CreateTaskInput = {
        originalPath: '/input/test-image.jpg',
      };

      await expect(createTaskUseCase.execute(input)).rejects.toThrow(
        'Queue error: Failed to add task'
      );
    });
  });
});
