import { Task } from '../../../src/domain/entities/Task';
import { TaskStatus } from '../../../src/domain/value-objects/TaskStatus';
import { Price } from '../../../src/domain/value-objects/Price';
import { TaskRepository } from '../../../src/domain/repositories/TaskRepository';
import { GetTaskUseCase, GetTaskInput } from '../../../src/application/use-cases/GetTaskUseCase';

class MockTaskRepository implements TaskRepository {
  private tasks: Map<string, Task> = new Map();
  public findByIdCalled = false;
  public lastQueriedId: string | null = null;

  async save(task: Task): Promise<Task> {
    this.tasks.set(task.id, task);
    return task;
  }

  async findById(id: string): Promise<Task | null> {
    this.findByIdCalled = true;
    this.lastQueriedId = id;
    return this.tasks.get(id) || null;
  }

  addTask(task: Task): void {
    this.tasks.set(task.id, task);
  }

  reset(): void {
    this.tasks.clear();
    this.findByIdCalled = false;
    this.lastQueriedId = null;
  }
}

describe('GetTaskUseCase', () => {
  let getTaskUseCase: GetTaskUseCase;
  let mockRepository: MockTaskRepository;

  beforeEach(() => {
    mockRepository = new MockTaskRepository();
    getTaskUseCase = new GetTaskUseCase(mockRepository);
  });

  afterEach(() => {
    mockRepository.reset();
  });

  describe('successful task retrieval', () => {
    it('should retrieve a pending task with correct data', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: GetTaskInput = { taskId: task.id };
      const output = await getTaskUseCase.execute(input);

      expect(output).toBeDefined();
      expect(output.taskId).toBe(task.id);
      expect(output.status).toBe('pending');
      expect(output.price).toBe(task.price.value);
      expect(output.images).toEqual([]);
    });

    it('should retrieve a completed task with images', async () => {
      const task = Task.create('/input/test-image.jpg');
      const images = [
        { resolution: '1024', path: '/output/image1/1024/hash1.jpg' },
        { resolution: '800', path: '/output/image1/800/hash2.jpg' },
      ];
      const completedTask = task.complete(images);
      mockRepository.addTask(completedTask);

      const input: GetTaskInput = { taskId: completedTask.id };
      const output = await getTaskUseCase.execute(input);

      expect(output.taskId).toBe(completedTask.id);
      expect(output.status).toBe('completed');
      expect(output.price).toBe(completedTask.price.value);
      expect(output.images).toEqual(images);
      expect(output.images).toHaveLength(2);
    });

    it('should retrieve a failed task with error message', async () => {
      const task = Task.create('/input/test-image.jpg');
      const failedTask = task.fail('Image processing failed');
      mockRepository.addTask(failedTask);

      const input: GetTaskInput = { taskId: failedTask.id };
      const output = await getTaskUseCase.execute(input);

      expect(output.taskId).toBe(failedTask.id);
      expect(output.status).toBe('failed');
      expect(output.price).toBe(failedTask.price.value);
      expect(output.images).toEqual([]);
      expect(output.errorMessage).toBe('Image processing failed');
    });

    it('should call repository findById with correct taskId', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: GetTaskInput = { taskId: task.id };
      await getTaskUseCase.execute(input);

      expect(mockRepository.findByIdCalled).toBe(true);
      expect(mockRepository.lastQueriedId).toBe(task.id);
    });
  });

  describe('task not found', () => {
    it('should throw error when task does not exist', async () => {
      const input: GetTaskInput = { taskId: 'non-existent-id' };

      await expect(getTaskUseCase.execute(input)).rejects.toThrow('Task not found');
    });

    it('should throw error with proper message for UUID format', async () => {
      const input: GetTaskInput = { taskId: '65d4a54b-89c5-e342-b2c2-c5f6abcdef12' };

      await expect(getTaskUseCase.execute(input)).rejects.toThrow('Task not found');
    });

    it('should call repository before throwing error', async () => {
      const input: GetTaskInput = { taskId: 'non-existent-id' };

      await expect(getTaskUseCase.execute(input)).rejects.toThrow();
      expect(mockRepository.findByIdCalled).toBe(true);
    });
  });

  describe('input validation', () => {
    it('should reject empty taskId', async () => {
      const input: GetTaskInput = { taskId: '' };

      await expect(getTaskUseCase.execute(input)).rejects.toThrow();
    });

    it('should reject null taskId', async () => {
      const input: any = { taskId: null };

      await expect(getTaskUseCase.execute(input)).rejects.toThrow();
    });

    it('should reject undefined taskId', async () => {
      const input: any = { taskId: undefined };

      await expect(getTaskUseCase.execute(input)).rejects.toThrow();
    });

    it('should trim whitespace from taskId', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: GetTaskInput = { taskId: `  ${task.id}  ` };
      const output = await getTaskUseCase.execute(input);

      expect(output.taskId).toBe(task.id);
      expect(mockRepository.lastQueriedId).toBe(task.id);
    });

    it('should reject whitespace-only taskId', async () => {
      const input: GetTaskInput = { taskId: '   ' };

      await expect(getTaskUseCase.execute(input)).rejects.toThrow();
    });
  });

  describe('output format', () => {
    it('should return output with all required fields for pending task', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: GetTaskInput = { taskId: task.id };
      const output = await getTaskUseCase.execute(input);

      expect(output).toHaveProperty('taskId');
      expect(output).toHaveProperty('status');
      expect(output).toHaveProperty('price');
      expect(output).toHaveProperty('images');
    });

    it('should return output with images for completed task', async () => {
      const task = Task.create('/input/test-image.jpg');
      const images = [
        { resolution: '1024', path: '/output/image1/1024/hash1.jpg' },
      ];
      const completedTask = task.complete(images);
      mockRepository.addTask(completedTask);

      const input: GetTaskInput = { taskId: completedTask.id };
      const output = await getTaskUseCase.execute(input);

      expect(output.images).toBeDefined();
      expect(Array.isArray(output.images)).toBe(true);
      expect(output.images).toHaveLength(1);
      expect(output.images[0]).toHaveProperty('resolution');
      expect(output.images[0]).toHaveProperty('path');
    });

    it('should return status as string, not TaskStatus object', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: GetTaskInput = { taskId: task.id };
      const output = await getTaskUseCase.execute(input);

      expect(typeof output.status).toBe('string');
    });

    it('should return price as number, not Price object', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: GetTaskInput = { taskId: task.id };
      const output = await getTaskUseCase.execute(input);

      expect(typeof output.price).toBe('number');
    });

    it('should not include errorMessage for pending task', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: GetTaskInput = { taskId: task.id };
      const output = await getTaskUseCase.execute(input);

      expect(output.errorMessage).toBeUndefined();
    });

    it('should not include errorMessage for completed task', async () => {
      const task = Task.create('/input/test-image.jpg');
      const images = [{ resolution: '1024', path: '/output/image1/1024/hash1.jpg' }];
      const completedTask = task.complete(images);
      mockRepository.addTask(completedTask);

      const input: GetTaskInput = { taskId: completedTask.id };
      const output = await getTaskUseCase.execute(input);

      expect(output.errorMessage).toBeUndefined();
    });

    it('should include errorMessage for failed task', async () => {
      const task = Task.create('/input/test-image.jpg');
      const failedTask = task.fail('Processing error');
      mockRepository.addTask(failedTask);

      const input: GetTaskInput = { taskId: failedTask.id };
      const output = await getTaskUseCase.execute(input);

      expect(output.errorMessage).toBeDefined();
      expect(output.errorMessage).toBe('Processing error');
    });
  });

  describe('different task states', () => {
    it('should handle pending task correctly', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: GetTaskInput = { taskId: task.id };
      const output = await getTaskUseCase.execute(input);

      expect(output.status).toBe('pending');
      expect(output.images).toEqual([]);
    });

    it('should handle completed task with multiple images', async () => {
      const task = Task.create('/input/test-image.jpg');
      const images = [
        { resolution: '1024', path: '/output/image1/1024/hash1.jpg' },
        { resolution: '800', path: '/output/image1/800/hash2.jpg' },
        { resolution: '600', path: '/output/image1/600/hash3.jpg' },
      ];
      const completedTask = task.complete(images);
      mockRepository.addTask(completedTask);

      const input: GetTaskInput = { taskId: completedTask.id };
      const output = await getTaskUseCase.execute(input);

      expect(output.status).toBe('completed');
      expect(output.images).toHaveLength(3);
    });

    it('should handle failed task correctly', async () => {
      const task = Task.create('/input/test-image.jpg');
      const failedTask = task.fail('Disk full');
      mockRepository.addTask(failedTask);

      const input: GetTaskInput = { taskId: failedTask.id };
      const output = await getTaskUseCase.execute(input);

      expect(output.status).toBe('failed');
      expect(output.images).toEqual([]);
      expect(output.errorMessage).toBe('Disk full');
    });
  });

  describe('task reconstitution', () => {
    it('should handle tasks reconstituted from database', async () => {
      const task = Task.reconstitute(
        '65d4a54b-89c5-e342-b2c2-c5f6abcdef12',
        TaskStatus.createCompleted(),
        Price.createRandom(),
        new Date('2024-06-01T12:00:00Z'),
        new Date('2024-06-01T12:10:00Z'),
        '/input/image1.jpg',
        [
          { resolution: '1024', path: '/output/image1/1024/hash1.jpg' },
          { resolution: '800', path: '/output/image1/800/hash2.jpg' },
        ]
      );
      mockRepository.addTask(task);

      const input: GetTaskInput = { taskId: task.id };
      const output = await getTaskUseCase.execute(input);

      expect(output.taskId).toBe('65d4a54b-89c5-e342-b2c2-c5f6abcdef12');
      expect(output.status).toBe('completed');
      expect(output.images).toHaveLength(2);
    });
  });

  describe('use case behavior', () => {
    it('should be idempotent - multiple calls return same data', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: GetTaskInput = { taskId: task.id };
      const output1 = await getTaskUseCase.execute(input);
      const output2 = await getTaskUseCase.execute(input);

      expect(output1).toEqual(output2);
    });

    it('should reflect task state changes', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: GetTaskInput = { taskId: task.id };
      const output1 = await getTaskUseCase.execute(input);
      expect(output1.status).toBe('pending');

      const images = [{ resolution: '1024', path: '/output/image1/1024/hash1.jpg' }];
      const completedTask = task.complete(images);
      mockRepository.addTask(completedTask);

      const output2 = await getTaskUseCase.execute(input);
      expect(output2.status).toBe('completed');
      expect(output2.images).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should handle task with very long original path', async () => {
      const longPath = '/input/' + 'a'.repeat(500) + '/image.jpg';
      const task = Task.create(longPath);
      mockRepository.addTask(task);

      const input: GetTaskInput = { taskId: task.id };
      const output = await getTaskUseCase.execute(input);

      expect(output.taskId).toBe(task.id);
    });

    it('should handle task with unicode characters in path', async () => {
      const task = Task.create('/input/图片/фото/صورة.jpg');
      mockRepository.addTask(task);

      const input: GetTaskInput = { taskId: task.id };
      const output = await getTaskUseCase.execute(input);

      expect(output.taskId).toBe(task.id);
    });

    it('should handle completed task with empty images array gracefully', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: GetTaskInput = { taskId: task.id };
      const output = await getTaskUseCase.execute(input);

      expect(output.images).toEqual([]);
      expect(Array.isArray(output.images)).toBe(true);
    });
  });

  describe('domain logic integration', () => {
    it('should preserve task immutability', async () => {
      const task = Task.create('/input/test-image.jpg');
      mockRepository.addTask(task);

      const input: GetTaskInput = { taskId: task.id };
      const output = await getTaskUseCase.execute(input);

      expect(output.taskId).toBe(task.id);
      expect(output.status).toBe(task.status.value);
      expect(output.price).toBe(task.price.value);
    });

    it('should correctly map Task entity to output DTO', async () => {
      const task = Task.create('/input/test-image.jpg');
      const images = [
        { resolution: '1024', path: '/output/image1/1024/hash1.jpg' },
      ];
      const completedTask = task.complete(images);
      mockRepository.addTask(completedTask);

      const input: GetTaskInput = { taskId: completedTask.id };
      const output = await getTaskUseCase.execute(input);

      expect(output.taskId).toBe(completedTask.id);
      expect(output.status).toBe(completedTask.status.value);
      expect(output.price).toBe(completedTask.price.value);
      expect(output.images).toEqual(completedTask.images);
    });
  });
});
