import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

export const errorHandler = (
  error: FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log error
  request.log.error({
    err: error,
    reqId: request.id,
    url: request.url,
    method: request.method,
  });

  // Handle Fastify validation errors
  if ('validation' in error && error.validation) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Validation Error',
      message: error.message,
      details: error.validation,
    });
  }

  // Handle custom AppErrors
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      error: error.name,
      message: error.message,
    });
  }

  // Handle unknown errors
  const statusCode = error.statusCode || 500;
  const message = isDevelopment ? error.message : 'Internal Server Error';

  return reply.status(statusCode).send({
    statusCode,
    error: error.name || 'InternalServerError',
    message,
    ...(isDevelopment && { stack: error.stack }),
  });
};
