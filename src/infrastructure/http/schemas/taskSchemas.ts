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
  description: 'Create a new image processing task',
  tags: ['tasks'],
  summary: 'Submit an image for processing',
  body: {
    type: 'object',
    required: ['originalPath'],
    properties: {
      originalPath: {
        type: 'string',
        minLength: 1,
        maxLength: 2048,
        description: 'Path or URL to the original image to be processed',
        example: 'https://example.com/image.jpg',
      },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: 'object',
      description: 'Task created successfully',
      properties: {
        taskId: {
          type: 'string',
          description: 'Unique identifier for the created task',
          example: '507f1f77bcf86cd799439011',
        },
        status: {
          type: 'string',
          enum: ['pending', 'completed', 'failed'],
          description: 'Current status of the task',
          example: 'pending',
        },
        price: {
          type: 'number',
          minimum: 0,
          description: 'Processing price in credits',
          example: 10,
        },
      },
      required: ['taskId', 'status', 'price'],
    },
    400: { $ref: 'ErrorResponse#' },
    500: { $ref: 'ErrorResponse#' },
  },
};

export const getTaskSchema: FastifySchema = {
  description: 'Retrieve task status and processed images',
  tags: ['tasks'],
  summary: 'Get task details by ID',
  params: {
    type: 'object',
    required: ['taskId'],
    properties: {
      taskId: {
        type: 'string',
        minLength: 1,
        description: 'Unique identifier of the task',
        example: '507f1f77bcf86cd799439011',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      description: 'Task details retrieved successfully',
      properties: {
        taskId: {
          type: 'string',
          description: 'Unique identifier for the task',
          example: '507f1f77bcf86cd799439011',
        },
        status: {
          type: 'string',
          enum: ['pending', 'completed', 'failed'],
          description: 'Current status of the task',
          example: 'completed',
        },
        price: {
          type: 'number',
          minimum: 0,
          description: 'Processing price in credits',
          example: 10,
        },
        images: {
          type: 'array',
          description: 'Array of processed images in different resolutions',
          items: {
            type: 'object',
            properties: {
              resolution: {
                type: 'string',
                description: 'Image resolution (e.g., 1920x1080, 1280x720)',
                example: '1920x1080',
              },
              path: {
                type: 'string',
                description: 'File path to the processed image',
                example: '/output/507f1f77bcf86cd799439011_1920x1080.jpg',
              },
            },
            required: ['resolution', 'path'],
          },
        },
        errorMessage: {
          type: 'string',
          description: 'Error message if the task failed',
          example: 'Failed to process image: Invalid format',
        },
      },
      required: ['taskId', 'status', 'price'],
    },
    404: { $ref: 'ErrorResponse#' },
    500: { $ref: 'ErrorResponse#' },
  },
};
