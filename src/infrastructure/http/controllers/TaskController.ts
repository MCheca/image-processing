import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateTaskUseCase } from '../../../application/use-cases/CreateTaskUseCase';
import { GetTaskUseCase } from '../../../application/use-cases/GetTaskUseCase';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

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
    const body = request.body as CreateTaskBody;

    if (!body.originalPath) {
      throw new ValidationError('originalPath is required and cannot be empty');
    }

    const output = await this.createTaskUseCase.execute({
      originalPath: body.originalPath,
    });

    reply.code(201).send({
      taskId: output.taskId,
      status: output.status,
      price: output.price,
    });
  }

  async getTask(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const params = request.params as GetTaskParams;

    if (!params.taskId) {
      throw new ValidationError('taskId is required and cannot be empty');
    }

    try {
      const output = await this.getTaskUseCase.execute({
        taskId: params.taskId,
      });

      reply.code(200).send({
        taskId: output.taskId,
        status: output.status,
        price: output.price,
        images: output.images,
        ...(output.errorMessage && { errorMessage: output.errorMessage }),
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.toLowerCase().includes('not found')) {
          throw new NotFoundError(error.message);
        }
        if (error.message.toLowerCase().includes('invalid')) {
          throw new ValidationError(error.message);
        }
      }
      throw error;
    }
  }
}
