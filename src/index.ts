import { createServer } from './infrastructure/http/server';
import { DatabaseConnection } from './infrastructure/persistence/database';
import { config } from './infrastructure/config';

const start = async () => {
  try {
    // Initialize database connection
    const database = DatabaseConnection.getInstance();
    await database.connect(); // Configuration now handled inside DatabaseConnection
    console.log('Connected to database');

    // Create and start server
    const server = await createServer();

    await server.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`Server is running on http://localhost:${config.PORT}`);

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`${signal} received, closing server gracefully...`);

      try {
        // Close queue and worker connections
        if ((server as any).container?.shutdown) {
          await (server as any).container.shutdown();
          console.log('Queue and worker connections closed');
        }

        // Stop accepting new connections
        await server.close();

        // Close database
        await database.disconnect();

        console.log('Server and database connections closed');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      } finally {
        // Add timeout to force shutdown
        setTimeout(() => {
          console.error('Forceful shutdown after timeout');
          process.exit(1);
        }, 10000); // 10 seconds
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

start();
