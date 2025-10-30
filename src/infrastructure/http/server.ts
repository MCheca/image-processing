import Fastify, { FastifyInstance } from 'fastify';

export const createServer = async (): Promise<FastifyInstance> => {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // TODO: Register plugins (swagger, etc.)
  // TODO: Register routes
  // TODO: Register error handlers

  return server;
};
