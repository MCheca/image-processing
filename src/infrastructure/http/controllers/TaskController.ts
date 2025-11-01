import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateTaskUseCase } from '../../../application/use-cases/CreateTaskUseCase';
import { GetTaskUseCase } from '../../../application/use-cases/GetTaskUseCase';

interface CreateTaskBody {
  originalPath?: string;
}

interface GetTaskParams {
  taskId?: string;
}

export class TaskController {
  constructor(
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly getTaskUseCase: GetTaskUseCase
  ) {}

  async createTask(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const body = request.body as CreateTaskBody;

      // Validate request body
      if (!body || !body.originalPath || body.originalPath.trim() === '') {
        reply.code(400).send({
          error: 'originalPath is required and cannot be empty',
        });
        return;
      }

      // Execute use case
      const output = await this.createTaskUseCase.execute({
        originalPath: body.originalPath,
      });

      // Return 201 Created with task data
      reply.code(201).send({
        taskId: output.taskId,
        status: output.status,
        price: output.price,
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  async getTask(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const params = request.params as GetTaskParams;

      // Validate taskId parameter
      if (!params.taskId || params.taskId.trim() === '') {
        reply.code(400).send({
          error: 'taskId is required and cannot be empty',
        });
        return;
      }

      // Execute use case
      const output = await this.getTaskUseCase.execute({
        taskId: params.taskId,
      });

      // Return 200 OK with task data
      reply.code(200).send({
        taskId: output.taskId,
        status: output.status,
        price: output.price,
        images: output.images,
        ...(output.errorMessage && { errorMessage: output.errorMessage }),
      });
    } catch (error) {
      this.handleError(error, reply);
    }
  }

  private handleError(error: unknown, reply: FastifyReply): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if it's a "not found" error
    if (errorMessage.toLowerCase().includes('not found')) {
      reply.code(404).send({
        error: errorMessage,
      });
      return;
    }

    // Check if it's a validation error
    if (
      errorMessage.toLowerCase().includes('cannot be empty') ||
      errorMessage.toLowerCase().includes('invalid')
    ) {
      reply.code(400).send({
        error: errorMessage,
      });
      return;
    }

    // Default to 500 Internal Server Error
    reply.code(500).send({
      error: errorMessage,
    });
  }
}
