import mongoose from 'mongoose';
import { config } from '../config';

export interface DatabaseConfig {
  uri: string;
  options?: mongoose.ConnectOptions;
}

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected = false;

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async connect(customConfig?: DatabaseConfig): Promise<void> {
    if (this.isConnected) {
      return;
    }

    const dbConfig = customConfig || { uri: config.MONGODB_URI };

    await mongoose.connect(dbConfig.uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      ...dbConfig.options,
    });

    this.isConnected = true;

    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      this.isConnected = false;
      console.warn('MongoDB disconnected');
    });
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    await mongoose.disconnect();
    this.isConnected = false;
  }

  getConnection(): typeof mongoose {
    return mongoose;
  }

  isReady(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  getConnectionName(): string {
    return mongoose.connection.name || '';
  }
}
