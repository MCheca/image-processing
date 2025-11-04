import { Queue } from 'bullmq';
import { ITaskQueue } from '../../domain/services/ITaskQueue';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

interface JobData {
  taskId: string;
  imageSource: {
    type: 'buffer' | 'url';
    data?: string; // base64 for buffer
    url?: string; // URL or path for string
  };
  filename?: string;
}

export class BullMQTaskQueue implements ITaskQueue {
  public readonly queue: Queue;

  constructor(redisConfig: RedisConfig, queueName: string = 'image-processing') {
    this.queue = new Queue(queueName, {
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 86400, // 24 hours in seconds
          count: 1000,
        },
        removeOnFail: {
          age: 604800, // 7 days in seconds
        },
      },
    });
  }

  async addTask(
    taskId: string,
    imageSource: string | Buffer,
    filename?: string
  ): Promise<void> {
    // Validate inputs
    if (!taskId || taskId.trim() === '') {
      throw new Error('Task ID cannot be empty');
    }

    if (imageSource === null || imageSource === undefined) {
      throw new Error('Image source cannot be null or undefined');
    }

    // Prepare job data based on input type
    const jobData: JobData = {
      taskId,
      imageSource: this.serializeImageSource(imageSource),
      filename,
    };

    // Add job to queue
    await this.queue.add('processImage', jobData);
  }

  private serializeImageSource(imageSource: string | Buffer): JobData['imageSource'] {
    if (Buffer.isBuffer(imageSource)) {
      return {
        type: 'buffer',
        data: imageSource.toString('base64'),
      };
    } else {
      return {
        type: 'url',
        url: imageSource,
      };
    }
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
