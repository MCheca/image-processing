import { FastifySchema } from 'fastify';

export const errorResponseSchema = {
  $id: 'ErrorResponse',
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    statusCode: { type: 'number' },
  },
};

export const createTaskSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['originalPath'],
    properties: {
      originalPath: {
        type: 'string',
        minLength: 1,
        maxLength: 2048,
      },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'completed', 'failed'] },
        price: { type: 'number', minimum: 0 },
      },
      required: ['taskId', 'status', 'price'],
    },
    400: { $ref: 'ErrorResponse#' },
    500: { $ref: 'ErrorResponse#' },
  },
};

export const getTaskSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['taskId'],
    properties: {
      taskId: {
        type: 'string',
        minLength: 1,
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'completed', 'failed'] },
        price: { type: 'number', minimum: 0 },
        images: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              resolution: { type: 'string' },
              path: { type: 'string' },
            },
            required: ['resolution', 'path'],
          },
        },
        errorMessage: { type: 'string' },
      },
      required: ['taskId', 'status', 'price'],
    },
    404: { $ref: 'ErrorResponse#' },
    500: { $ref: 'ErrorResponse#' },
  },
};
