import { createServer } from './infrastructure/http/server';

const start = async () => {
  try {
    const server = await createServer();
    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server is running on http://localhost:${PORT}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

start();
