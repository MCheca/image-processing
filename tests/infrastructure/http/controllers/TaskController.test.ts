import { FastifyRequest, FastifyReply } from 'fastify';
import { TaskController } from '../../../../src/infrastructure/http/controllers/TaskController';
import { CreateTaskUseCase, CreateTaskInput, CreateTaskOutput } from '../../../../src/application/use-cases/CreateTaskUseCase';
import { GetTaskUseCase, GetTaskInput, GetTaskOutput } from '../../../../src/application/use-cases/GetTaskUseCase';

// Mock Use Cases
class MockCreateTaskUseCase {
  public executeCalled = false;
  public lastInput: CreateTaskInput | null = null;
  public shouldFail = false;
  public mockOutput: CreateTaskOutput = {
    taskId: '65d4a54b-89c5-e342-b2c2-c5f6abcdef12',
    status: 'pending',
    price: 25.5,
  };

  async execute(input: CreateTaskInput): Promise<CreateTaskOutput> {
    this.executeCalled = true;
    this.lastInput = input;

    if (this.shouldFail) {
      throw new Error('Original path cannot be empty');
    }

    return this.mockOutput;
  }

  reset(): void {
    this.executeCalled = false;
    this.lastInput = null;
    this.shouldFail = false;
  }
}

class MockGetTaskUseCase {
  public executeCalled = false;
  public lastInput: GetTaskInput | null = null;
  public shouldFail = false;
  public shouldThrowNotFound = false;
  public mockOutput: GetTaskOutput = {
    taskId: '65d4a54b-89c5-e342-b2c2-c5f6abcdef12',
    status: 'completed',
    price: 25.5,
    images: [
      { resolution: '1024', path: '/output/image1/1024/hash1.jpg' },
      { resolution: '800', path: '/output/image1/800/hash2.jpg' },
    ],
  };

  async execute(input: GetTaskInput): Promise<GetTaskOutput> {
    this.executeCalled = true;
    this.lastInput = input;

    if (this.shouldThrowNotFound) {
      throw new Error('Task not found');
    }

    if (this.shouldFail) {
      throw new Error('Database connection failed');
    }

    return this.mockOutput;
  }

  reset(): void {
    this.executeCalled = false;
    this.lastInput = null;
    this.shouldFail = false;
    this.shouldThrowNotFound = false;
  }
}


// Mock Fastify Request and Reply
const createMockRequest = (params?: any, body?: any, query?: any): Partial<FastifyRequest> => {
  return {
    params: params || {},
    body: body || {},
    query: query || {},
  };
};

const createMockReply = (): any => {
  const reply: any = {
    statusCode: 200,
    sent: false,
    code: jest.fn().mockReturnThis(),
    send: jest.fn(function (this: any, payload: any) {
      this.sent = true;
      this.payload = payload;
      return this;
    }),
  };
  return reply;
};

describe('TaskController', () => {
  let taskController: TaskController;
  let mockCreateTaskUseCase: MockCreateTaskUseCase;
  let mockGetTaskUseCase: MockGetTaskUseCase;

  beforeEach(() => {
    mockCreateTaskUseCase = new MockCreateTaskUseCase();
    mockGetTaskUseCase = new MockGetTaskUseCase();

    taskController = new TaskController(
      mockCreateTaskUseCase as any,
      mockGetTaskUseCase as any
    );
  });

  afterEach(() => {
    mockCreateTaskUseCase.reset();
    mockGetTaskUseCase.reset();
  });

  describe('createTask', () => {
    describe('successful task creation', () => {
      it('should create a task and return 201 status', async () => {
        const request = createMockRequest(undefined, { originalPath: '/input/test-image.jpg' });
        const reply = createMockReply();

        await taskController.createTask(request as FastifyRequest, reply as FastifyReply);

        expect(reply.code).toHaveBeenCalledWith(201);
        expect(reply.send).toHaveBeenCalled();
        expect(reply.sent).toBe(true);
      });

      it('should call CreateTaskUseCase with correct input', async () => {
        const request = createMockRequest(undefined, { originalPath: '/input/test-image.jpg' });
        const reply = createMockReply();

        await taskController.createTask(request as FastifyRequest, reply as FastifyReply);

        expect(mockCreateTaskUseCase.executeCalled).toBe(true);
        expect(mockCreateTaskUseCase.lastInput).toEqual({
          originalPath: '/input/test-image.jpg',
        });
      });

      it('should return task data in response body', async () => {
        const request = createMockRequest(undefined, { originalPath: '/input/test-image.jpg' });
        const reply = createMockReply();

        await taskController.createTask(request as FastifyRequest, reply as FastifyReply);

        expect(reply.payload).toEqual({
          taskId: '65d4a54b-89c5-e342-b2c2-c5f6abcdef12',
          status: 'pending',
          price: 25.5,
        });
      });

      it('should handle different file paths', async () => {
        const request = createMockRequest(undefined, { originalPath: 'https://example.com/photo.jpg' });
        const reply = createMockReply();

        await taskController.createTask(request as FastifyRequest, reply as FastifyReply);

        expect(mockCreateTaskUseCase.lastInput?.originalPath).toBe('https://example.com/photo.jpg');
        expect(reply.code).toHaveBeenCalledWith(201);
      });
    });

    describe('input validation', () => {
      it('should return 400 when originalPath is missing', async () => {
        const request = createMockRequest(undefined, {});
        const reply = createMockReply();

        await taskController.createTask(request as FastifyRequest, reply as FastifyReply);

        expect(reply.code).toHaveBeenCalledWith(400);
        expect(reply.payload).toHaveProperty('error');
      });

      it('should return 400 when originalPath is empty string', async () => {
        const request = createMockRequest(undefined, { originalPath: '' });
        const reply = createMockReply();
        mockCreateTaskUseCase.shouldFail = true;

        await taskController.createTask(request as FastifyRequest, reply as FastifyReply);

        expect(reply.code).toHaveBeenCalledWith(400);
        expect(reply.payload).toHaveProperty('error');
      });

      it('should return 400 when originalPath is null', async () => {
        const request = createMockRequest(undefined, { originalPath: null });
        const reply = createMockReply();

        await taskController.createTask(request as FastifyRequest, reply as FastifyReply);

        expect(reply.code).toHaveBeenCalledWith(400);
        expect(reply.payload).toHaveProperty('error');
      });

      it('should return 400 when request body is missing', async () => {
        const request = createMockRequest(undefined, undefined);
        const reply = createMockReply();

        await taskController.createTask(request as FastifyRequest, reply as FastifyReply);

        expect(reply.code).toHaveBeenCalledWith(400);
        expect(reply.payload).toHaveProperty('error');
      });

      it('should include error message in 400 response', async () => {
        const request = createMockRequest(undefined, {});
        const reply = createMockReply();

        await taskController.createTask(request as FastifyRequest, reply as FastifyReply);

        expect(reply.payload.error).toBeDefined();
        expect(typeof reply.payload.error).toBe('string');
      });
    });

    describe('error handling', () => {
      it('should return 500 when use case throws unexpected error', async () => {
        mockCreateTaskUseCase.execute = jest.fn().mockRejectedValue(new Error('Database error'));
        const request = createMockRequest(undefined, { originalPath: '/input/test-image.jpg' });
        const reply = createMockReply();

        await taskController.createTask(request as FastifyRequest, reply as FastifyReply);

        expect(reply.code).toHaveBeenCalledWith(500);
        expect(reply.payload).toHaveProperty('error');
      });

      it('should include error message in 500 response', async () => {
        mockCreateTaskUseCase.execute = jest.fn().mockRejectedValue(new Error('Database error'));
        const request = createMockRequest(undefined, { originalPath: '/input/test-image.jpg' });
        const reply = createMockReply();

        await taskController.createTask(request as FastifyRequest, reply as FastifyReply);

        expect(reply.payload.error).toBe('Database error');
      });
    });
  });

  describe('getTask', () => {
    describe('successful task retrieval', () => {
      it('should retrieve a task and return 200 status', async () => {
        const request = createMockRequest({ taskId: '65d4a54b-89c5-e342-b2c2-c5f6abcdef12' });
        const reply = createMockReply();

        await taskController.getTask(request as FastifyRequest, reply as FastifyReply);

        expect(reply.code).toHaveBeenCalledWith(200);
        expect(reply.send).toHaveBeenCalled();
        expect(reply.sent).toBe(true);
      });

      it('should call GetTaskUseCase with correct taskId', async () => {
        const request = createMockRequest({ taskId: '65d4a54b-89c5-e342-b2c2-c5f6abcdef12' });
        const reply = createMockReply();

        await taskController.getTask(request as FastifyRequest, reply as FastifyReply);

        expect(mockGetTaskUseCase.executeCalled).toBe(true);
        expect(mockGetTaskUseCase.lastInput).toEqual({
          taskId: '65d4a54b-89c5-e342-b2c2-c5f6abcdef12',
        });
      });

      it('should return complete task data in response body', async () => {
        const request = createMockRequest({ taskId: '65d4a54b-89c5-e342-b2c2-c5f6abcdef12' });
        const reply = createMockReply();

        await taskController.getTask(request as FastifyRequest, reply as FastifyReply);

        expect(reply.payload).toEqual({
          taskId: '65d4a54b-89c5-e342-b2c2-c5f6abcdef12',
          status: 'completed',
          price: 25.5,
          images: [
            { resolution: '1024', path: '/output/image1/1024/hash1.jpg' },
            { resolution: '800', path: '/output/image1/800/hash2.jpg' },
          ],
        });
      });

      it('should return task with errorMessage when task is failed', async () => {
        mockGetTaskUseCase.mockOutput = {
          taskId: '65d4a54b-89c5-e342-b2c2-c5f6abcdef12',
          status: 'failed',
          price: 25.5,
          images: [],
          errorMessage: 'Image processing failed',
        };
        const request = createMockRequest({ taskId: '65d4a54b-89c5-e342-b2c2-c5f6abcdef12' });
        const reply = createMockReply();

        await taskController.getTask(request as FastifyRequest, reply as FastifyReply);

        expect(reply.payload.errorMessage).toBe('Image processing failed');
        expect(reply.payload.status).toBe('failed');
      });
    });

    describe('task not found', () => {
      it('should return 404 when task does not exist', async () => {
        mockGetTaskUseCase.shouldThrowNotFound = true;
        const request = createMockRequest({ taskId: 'non-existent-id' });
        const reply = createMockReply();

        await taskController.getTask(request as FastifyRequest, reply as FastifyReply);

        expect(reply.code).toHaveBeenCalledWith(404);
        expect(reply.payload).toHaveProperty('error');
      });

      it('should include error message in 404 response', async () => {
        mockGetTaskUseCase.shouldThrowNotFound = true;
        const request = createMockRequest({ taskId: 'non-existent-id' });
        const reply = createMockReply();

        await taskController.getTask(request as FastifyRequest, reply as FastifyReply);

        expect(reply.payload.error).toContain('not found');
      });
    });

    describe('input validation', () => {
      it('should return 400 when taskId is missing', async () => {
        const request = createMockRequest({});
        const reply = createMockReply();

        await taskController.getTask(request as FastifyRequest, reply as FastifyReply);

        expect(reply.code).toHaveBeenCalledWith(400);
        expect(reply.payload).toHaveProperty('error');
      });

      it('should return 400 when taskId is empty string', async () => {
        const request = createMockRequest({ taskId: '' });
        const reply = createMockReply();

        await taskController.getTask(request as FastifyRequest, reply as FastifyReply);

        expect(reply.code).toHaveBeenCalledWith(400);
        expect(reply.payload).toHaveProperty('error');
      });

      it('should return 400 when taskId is null', async () => {
        const request = createMockRequest({ taskId: null });
        const reply = createMockReply();

        await taskController.getTask(request as FastifyRequest, reply as FastifyReply);

        expect(reply.code).toHaveBeenCalledWith(400);
        expect(reply.payload).toHaveProperty('error');
      });
    });

    describe('error handling', () => {
      it('should return 500 when use case throws unexpected error', async () => {
        mockGetTaskUseCase.shouldFail = true;
        const request = createMockRequest({ taskId: '65d4a54b-89c5-e342-b2c2-c5f6abcdef12' });
        const reply = createMockReply();

        await taskController.getTask(request as FastifyRequest, reply as FastifyReply);

        expect(reply.code).toHaveBeenCalledWith(500);
        expect(reply.payload).toHaveProperty('error');
      });

      it('should include error message in 500 response', async () => {
        mockGetTaskUseCase.shouldFail = true;
        const request = createMockRequest({ taskId: '65d4a54b-89c5-e342-b2c2-c5f6abcdef12' });
        const reply = createMockReply();

        await taskController.getTask(request as FastifyRequest, reply as FastifyReply);

        expect(reply.payload.error).toBe('Database connection failed');
      });
    });
  });


  describe('controller behavior', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        request: createMockRequest(undefined, { originalPath: `/input/image${i}.jpg` }),
        reply: createMockReply(),
      }));

      await Promise.all(
        requests.map(({ request, reply }) =>
          taskController.createTask(request as FastifyRequest, reply as FastifyReply)
        )
      );

      requests.forEach(({ reply }) => {
        expect(reply.code).toHaveBeenCalledWith(201);
        expect(reply.sent).toBe(true);
      });
    });

    it('should isolate errors between requests', async () => {
      const successRequest = createMockRequest(undefined, { originalPath: '/input/test-image.jpg' });
      const successReply = createMockReply();

      const failRequest = createMockRequest(undefined, {});
      const failReply = createMockReply();

      await taskController.createTask(successRequest as FastifyRequest, successReply as FastifyReply);
      await taskController.createTask(failRequest as FastifyRequest, failReply as FastifyReply);

      expect(successReply.code).toHaveBeenCalledWith(201);
      expect(failReply.code).toHaveBeenCalledWith(400);
    });
  });

  describe('edge cases', () => {
    it('should handle very long taskId', async () => {
      const longTaskId = 'a'.repeat(500);
      const request = createMockRequest({ taskId: longTaskId });
      const reply = createMockReply();

      await taskController.getTask(request as FastifyRequest, reply as FastifyReply);

      expect(mockGetTaskUseCase.lastInput?.taskId).toBe(longTaskId);
    });

    it('should handle special characters in originalPath', async () => {
      const request = createMockRequest(undefined, { originalPath: '/input/my-image_2024 (1).jpg' });
      const reply = createMockReply();

      await taskController.createTask(request as FastifyRequest, reply as FastifyReply);

      expect(mockCreateTaskUseCase.lastInput?.originalPath).toBe('/input/my-image_2024 (1).jpg');
    });

    it('should handle unicode characters in originalPath', async () => {
      const request = createMockRequest(undefined, { originalPath: '/input/图片/фото/صورة.jpg' });
      const reply = createMockReply();

      await taskController.createTask(request as FastifyRequest, reply as FastifyReply);

      expect(mockCreateTaskUseCase.lastInput?.originalPath).toBe('/input/图片/фото/صورة.jpg');
    });
  });

  describe('HTTP status codes', () => {
    it('should return 201 for successful task creation', async () => {
      const request = createMockRequest(undefined, { originalPath: '/input/test-image.jpg' });
      const reply = createMockReply();

      await taskController.createTask(request as FastifyRequest, reply as FastifyReply);

      expect(reply.code).toHaveBeenCalledWith(201);
    });

    it('should return 200 for successful task retrieval', async () => {
      const request = createMockRequest({ taskId: '65d4a54b-89c5-e342-b2c2-c5f6abcdef12' });
      const reply = createMockReply();

      await taskController.getTask(request as FastifyRequest, reply as FastifyReply);

      expect(reply.code).toHaveBeenCalledWith(200);
    });


    it('should return 400 for invalid input', async () => {
      const request = createMockRequest(undefined, {});
      const reply = createMockReply();

      await taskController.createTask(request as FastifyRequest, reply as FastifyReply);

      expect(reply.code).toHaveBeenCalledWith(400);
    });

    it('should return 404 for task not found', async () => {
      mockGetTaskUseCase.shouldThrowNotFound = true;
      const request = createMockRequest({ taskId: 'non-existent-id' });
      const reply = createMockReply();

      await taskController.getTask(request as FastifyRequest, reply as FastifyReply);

      expect(reply.code).toHaveBeenCalledWith(404);
    });

    it('should return 500 for server errors', async () => {
      mockGetTaskUseCase.shouldFail = true;
      const request = createMockRequest({ taskId: '65d4a54b-89c5-e342-b2c2-c5f6abcdef12' });
      const reply = createMockReply();

      await taskController.getTask(request as FastifyRequest, reply as FastifyReply);

      expect(reply.code).toHaveBeenCalledWith(500);
    });
  });

  describe('response format', () => {
    it('should return JSON response for createTask', async () => {
      const request = createMockRequest(undefined, { originalPath: '/input/test-image.jpg' });
      const reply = createMockReply();

      await taskController.createTask(request as FastifyRequest, reply as FastifyReply);

      expect(reply.payload).toHaveProperty('taskId');
      expect(reply.payload).toHaveProperty('status');
      expect(reply.payload).toHaveProperty('price');
    });

    it('should return JSON response for getTask', async () => {
      const request = createMockRequest({ taskId: '65d4a54b-89c5-e342-b2c2-c5f6abcdef12' });
      const reply = createMockReply();

      await taskController.getTask(request as FastifyRequest, reply as FastifyReply);

      expect(reply.payload).toHaveProperty('taskId');
      expect(reply.payload).toHaveProperty('status');
      expect(reply.payload).toHaveProperty('price');
      expect(reply.payload).toHaveProperty('images');
    });

    it('should return JSON error response for failures', async () => {
      const request = createMockRequest(undefined, {});
      const reply = createMockReply();

      await taskController.createTask(request as FastifyRequest, reply as FastifyReply);

      expect(reply.payload).toHaveProperty('error');
      expect(typeof reply.payload.error).toBe('string');
    });
  });
});
