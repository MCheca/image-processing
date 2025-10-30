import { Task, TaskImage } from '../../../src/domain/entities/Task';
import { TaskRepository } from '../../../src/domain/repositories/TaskRepository';
import { ImageProcessor } from '../../../src/domain/services/ImageProcessor';
import {
  ProcessImageUseCase,
  ProcessImageInput,
} from '../../../src/application/use-cases/ProcessImageUseCase';

class MockTaskRepository implements TaskRepository {
  private tasks: Map<string, Task> = new Map();
  public saveCalled = false;
  public saveCallCount = 0;
  public lastSavedTask: Task | null = null;
  public shouldFailOnSave = false;

  async save(task: Task): Promise<Task> {
    this.saveCalled = true;
    this.saveCallCount++;
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

  addTask(task: Task): void {
    this.tasks.set(task.id, task);
  }

  reset(): void {
    this.tasks.clear();
    this.saveCalled = false;
    this.saveCallCount = 0;
    this.lastSavedTask = null;
    this.shouldFailOnSave = false;
  }
}

class MockImageProcessor implements ImageProcessor {
  public processImageCalled = false;
  public lastSourcePath: string | null = null;
  public lastOutputDir: string | null = null;
  public lastResolutions: number[] | null = null;
  public shouldFail = false;
  public failureMessage = 'Image processing failed';
  public shouldReturnEmpty = false;

  async processImage(
    sourcePath: string,
    outputDir: string,
    resolutions: number[]
  ): Promise<TaskImage[]> {
    this.processImageCalled = true;
    this.lastSourcePath = sourcePath;
    this.lastOutputDir = outputDir;
    this.lastResolutions = resolutions;

    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    if (this.shouldReturnEmpty) {
      return [];
    }

    return resolutions.map((resolution) => ({
      resolution: resolution.toString(),
      path: `${outputDir}/${resolution}/abc123.jpg`,
    }));
  }

  reset(): void {
    this.processImageCalled = false;
    this.lastSourcePath = null;
    this.lastOutputDir = null;
    this.lastResolutions = null;
    this.shouldFail = false;
    this.failureMessage = 'Image processing failed';
    this.shouldReturnEmpty = false;
  }
}

describe('ProcessImageUseCase', () => {
  let processImageUseCase: ProcessImageUseCase;
  let mockRepository: MockTaskRepository;
  let mockImageProcessor: MockImageProcessor;

  beforeEach(() => {
    mockRepository = new MockTaskRepository();
    mockImageProcessor = new MockImageProcessor();
    processImageUseCase = new ProcessImageUseCase(mockRepository, mockImageProcessor);
  });

  afterEach(() => {
    mockRepository.reset();
    mockImageProcessor.reset();
  });

  describe('successful image processing', () => {
    it('should process image and complete the task', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      expect(mockRepository.saveCalled).toBe(true);
      expect(mockRepository.lastSavedTask).not.toBeNull();
      expect(mockRepository.lastSavedTask!.status.isCompleted()).toBe(true);
    });

    it('should call image processor with correct parameters', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      expect(mockImageProcessor.processImageCalled).toBe(true);
      expect(mockImageProcessor.lastSourcePath).toBe('/input/test-image.jpg');
      expect(mockImageProcessor.lastResolutions).toEqual([1024, 800]);
    });

    it('should update task with processed images', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      const completedTask = mockRepository.lastSavedTask!;
      expect(completedTask.images).toHaveLength(2);
      expect(completedTask.images[0].resolution).toBe('1024');
      expect(completedTask.images[1].resolution).toBe('800');
    });

    it('should save task only once after processing', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      expect(mockRepository.saveCallCount).toBe(1);
    });

    it('should generate output directory based on original filename', async () => {
      const task = Task.create('/input/my-photo.jpg');
      mockRepository.addTask(task);

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      expect(mockImageProcessor.lastOutputDir).toContain('my-photo');
    });

    it('should handle path with complex filename', async () => {
      const task = Task.create('/input/path/to/my-image_2024.jpg');
      mockRepository.addTask(task);

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      expect(mockImageProcessor.processImageCalled).toBe(true);
      expect(mockImageProcessor.lastSourcePath).toBe('/input/path/to/my-image_2024.jpg');
    });
  });

  describe('task not found', () => {
    it('should throw error when task does not exist', async () => {
      const input: ProcessImageInput = { taskId: 'non-existent-id' };

      await expect(processImageUseCase.execute(input)).rejects.toThrow('Task not found');
    });

    it('should not call image processor if task not found', async () => {
      const input: ProcessImageInput = { taskId: 'non-existent-id' };

      await expect(processImageUseCase.execute(input)).rejects.toThrow();
      expect(mockImageProcessor.processImageCalled).toBe(false);
    });
  });

  describe('image processing failures', () => {
    it('should mark task as failed when image processing fails', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);
      mockImageProcessor.shouldFail = true;
      mockImageProcessor.failureMessage = 'Unsupported image format';

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      const failedTask = mockRepository.lastSavedTask!;
      expect(failedTask.status.isFailed()).toBe(true);
      expect(failedTask.errorMessage).toBe('Unsupported image format');
    });

    it('should save failed task to repository', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);
      mockImageProcessor.shouldFail = true;

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      expect(mockRepository.saveCalled).toBe(true);
      expect(mockRepository.lastSavedTask!.status.isFailed()).toBe(true);
    });

    it('should not throw error when processing fails - just marks as failed', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);
      mockImageProcessor.shouldFail = true;

      const input: ProcessImageInput = { taskId: task.id };
      await expect(processImageUseCase.execute(input)).resolves.not.toThrow();
    });

    it('should handle various error messages', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);
      mockImageProcessor.shouldFail = true;
      mockImageProcessor.failureMessage = 'Disk full';

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      expect(mockRepository.lastSavedTask!.errorMessage).toBe('Disk full');
    });
  });

  describe('input validation', () => {
    it('should reject empty taskId', async () => {
      const input: ProcessImageInput = { taskId: '' };

      await expect(processImageUseCase.execute(input)).rejects.toThrow();
    });

    it('should reject null taskId', async () => {
      const input: any = { taskId: null };

      await expect(processImageUseCase.execute(input)).rejects.toThrow();
    });

    it('should reject undefined taskId', async () => {
      const input: any = { taskId: undefined };

      await expect(processImageUseCase.execute(input)).rejects.toThrow();
    });

    it('should trim whitespace from taskId', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: ProcessImageInput = { taskId: `  ${task.id}  ` };
      await processImageUseCase.execute(input);

      expect(mockRepository.lastSavedTask!.id).toBe(task.id);
    });

    it('should reject whitespace-only taskId', async () => {
      const input: ProcessImageInput = { taskId: '   ' };

      await expect(processImageUseCase.execute(input)).rejects.toThrow();
    });
  });

  describe('task state validation', () => {
    it('should not process already completed task', async () => {
      const task = Task.create('/input/test-image.jpg');
      const images = [
        { resolution: '1024', path: '/output/test/1024/hash.jpg' },
        { resolution: '800', path: '/output/test/800/hash.jpg' },
      ];
      const completedTask = task.complete(images);
      mockRepository.addTask(completedTask);

      const input: ProcessImageInput = { taskId: completedTask.id };
      await processImageUseCase.execute(input);

      expect(mockImageProcessor.processImageCalled).toBe(false);
    });

    it('should not process already failed task', async () => {
      const task = Task.create('/input/test-image.jpg');
      const failedTask = task.fail('Previous error');
      mockRepository.addTask(failedTask);

      const input: ProcessImageInput = { taskId: failedTask.id };
      await processImageUseCase.execute(input);

      expect(mockImageProcessor.processImageCalled).toBe(false);
    });

    it('should only process pending tasks', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      expect(mockImageProcessor.processImageCalled).toBe(true);
    });
  });

  describe('image resolutions', () => {
    it('should process images with 1024px and 800px resolutions', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      expect(mockImageProcessor.lastResolutions).toEqual([1024, 800]);
    });

    it('should save both resolution variants', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      const completedTask = mockRepository.lastSavedTask!;
      const resolutions = completedTask.images.map((img) => img.resolution);
      expect(resolutions).toContain('1024');
      expect(resolutions).toContain('800');
    });
  });

  describe('output path format', () => {
    it('should generate output paths with correct structure', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      const completedTask = mockRepository.lastSavedTask!;
      completedTask.images.forEach((image) => {
        expect(image.path).toContain(image.resolution);
        expect(image.path).toMatch(/\.(jpg|jpeg|png|webp)$/i);
      });
    });
  });

  describe('use case behavior', () => {
    it('should be idempotent for completed tasks', async () => {
      const task = Task.create('/input/test-image.jpg');
      const images = [{ resolution: '1024', path: '/output/test/1024/hash.jpg' }];
      const completedTask = task.complete(images);
      mockRepository.addTask(completedTask);

      const input: ProcessImageInput = { taskId: completedTask.id };
      await processImageUseCase.execute(input);
      await processImageUseCase.execute(input);

      expect(mockImageProcessor.processImageCalled).toBe(false);
      expect(mockRepository.saveCallCount).toBe(0);
    });

    it('should update task state from pending to completed', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);
      expect(task.status.isPending()).toBe(true);

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      const updatedTask = mockRepository.lastSavedTask!;
      expect(updatedTask.status.isCompleted()).toBe(true);
      expect(updatedTask.id).toBe(task.id);
    });
  });

  describe('edge cases', () => {
    it('should handle URL paths', async () => {
      const task = Task.create('https://example.com/images/photo.jpg');
      mockRepository.addTask(task);

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      expect(mockImageProcessor.lastSourcePath).toBe('https://example.com/images/photo.jpg');
    });

    it('should handle Windows-style paths', async () => {
      const task = Task.create('C:\\Users\\test\\images\\photo.jpg');
      mockRepository.addTask(task);

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      expect(mockImageProcessor.lastSourcePath).toBe('C:\\Users\\test\\images\\photo.jpg');
    });

    it('should handle paths with unicode characters', async () => {
      const task = Task.create('/input/图片/фото/صورة.jpg');
      mockRepository.addTask(task);

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      expect(mockImageProcessor.processImageCalled).toBe(true);
    });

    it('should handle very long paths', async () => {
      const longPath = '/input/' + 'a'.repeat(500) + '/image.jpg';
      const task = Task.create(longPath);
      mockRepository.addTask(task);

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      expect(mockImageProcessor.lastSourcePath).toBe(longPath);
    });
  });

  describe('repository save failures', () => {
    it('should handle repository save failure gracefully', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);
      mockRepository.shouldFailOnSave = true;

      const input: ProcessImageInput = { taskId: task.id };

      await expect(processImageUseCase.execute(input)).rejects.toThrow(
        'Database error: Failed to save task'
      );
    });

    it('should process image before save fails', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);
      mockRepository.shouldFailOnSave = true;

      const input: ProcessImageInput = { taskId: task.id };

      await expect(processImageUseCase.execute(input)).rejects.toThrow();
      expect(mockImageProcessor.processImageCalled).toBe(true);
    });
  });

  describe('empty images from processor', () => {
    it('should fail task when processor returns empty images array', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);
      mockImageProcessor.shouldReturnEmpty = true;

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      const savedTask = mockRepository.lastSavedTask!;
      expect(savedTask.status.isFailed()).toBe(true);
      expect(savedTask.errorMessage).toContain('No images generated');
    });

    it('should not throw error when processor returns empty array', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);
      mockImageProcessor.shouldReturnEmpty = true;

      const input: ProcessImageInput = { taskId: task.id };
      await expect(processImageUseCase.execute(input)).resolves.not.toThrow();
    });
  });

  describe('domain logic integration', () => {
    it('should preserve task immutability', async () => {
      const originalTask = Task.create('/input/test-image.jpg');
      mockRepository.addTask(originalTask);

      const input: ProcessImageInput = { taskId: originalTask.id };
      await processImageUseCase.execute(input);

      expect(originalTask.status.isPending()).toBe(true);
      expect(originalTask.images).toEqual([]);

      const savedTask = mockRepository.lastSavedTask!;
      expect(savedTask.status.isCompleted()).toBe(true);
      expect(savedTask.images).not.toEqual([]);
    });

    it('should preserve original task properties', async () => {
      const task = Task.create('/input/test-image.jpg');
      const originalPrice = task.price.value;
      const originalCreatedAt = task.createdAt;
      mockRepository.addTask(task);

      const input: ProcessImageInput = { taskId: task.id };
      await processImageUseCase.execute(input);

      const savedTask = mockRepository.lastSavedTask!;
      expect(savedTask.price.value).toBe(originalPrice);
      expect(savedTask.createdAt).toEqual(originalCreatedAt);
      expect(savedTask.originalPath).toBe('/input/test-image.jpg');
    });
  });
});
