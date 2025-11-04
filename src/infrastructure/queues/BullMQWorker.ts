import { Worker, Job } from 'bullmq';
import { ProcessImageUseCase } from '../../application/use-cases/ProcessImageUseCase';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

interface WorkerOptions {
  concurrency?: number;
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

export class BullMQWorker {
  private worker: Worker;

  constructor(
    redisConfig: RedisConfig,
    private readonly processImageUseCase: ProcessImageUseCase,
    options: WorkerOptions = {}
  ) {
    this.worker = new Worker(
      'image-processing',
      async (job: Job<JobData>) => this.processJob(job),
      {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
        },
        concurrency: options.concurrency || 1,
      }
    );
  }

  public async waitUntilReady(): Promise<void> {
    await this.worker.waitUntilReady();
  }

  private async processJob(job: Job<JobData>): Promise<void> {
    const { taskId, imageSource, filename } = job.data;

    // Deserialize image source based on type
    const deserializedSource = this.deserializeImageSource(imageSource);

    // Call ProcessImageUseCase
    await this.processImageUseCase.execute({
      taskId,
      imageSource: deserializedSource,
      filename,
    });
  }

  private deserializeImageSource(
    imageSource: JobData['imageSource']
  ): string | Buffer {
    if (imageSource.type === 'buffer' && imageSource.data) {
      return Buffer.from(imageSource.data, 'base64');
    } else if (imageSource.type === 'url' && imageSource.url) {
      return imageSource.url;
    }

    throw new Error('Invalid image source data');
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
