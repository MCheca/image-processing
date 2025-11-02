import { DatabaseConnection } from '../src/infrastructure/persistence/database';
import { TaskModel } from '../src/infrastructure/persistence/schemas/TaskSchema';
import { config } from '../src/infrastructure/config';
import { randomUUID } from 'crypto';

interface SeedTask {
  _id: string;
  status: 'pending' | 'completed' | 'failed';
  price: number;
  originalPath: string;
  images?: Array<{ resolution: string; path: string }>;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sampleImageUrls = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e',
  'https://images.unsplash.com/photo-1501594907352-04cda38ebc29',
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
  'https://images.unsplash.com/photo-1488372759477-a7f4aa078cb6',
  'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f',
];

const resolutions = ['1024', '800'];

const errorMessages = [
  'Image download failed: Network timeout',
  'Invalid image format: Unable to process corrupted file',
  'Image processing failed: Unsupported color space',
  'Image download failed: 404 Not Found',
  'Processing timeout: Image too large to process',
];

function randomPrice(): number {
  return Math.floor(Math.random() * 46) + 5; // Random between 5 and 50
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateCompletedTask(index: number, createdAt: Date): SeedTask {
  const updatedAt = new Date(createdAt.getTime() + Math.random() * 300000 + 60000); // 1-6 minutes after creation
  const imageName = `image${index}`;
  return {
    _id: randomUUID(),
    status: 'completed',
    price: randomPrice(),
    originalPath: sampleImageUrls[index % sampleImageUrls.length],
    images: resolutions.map((resolution) => {
      // Generate a random md5-like hash (32 hex characters)
      const hash = Math.random().toString(36).substring(2, 15) +
                   Math.random().toString(36).substring(2, 15) +
                   Math.random().toString(36).substring(2, 15);
      return {
        resolution,
        path: `/output/${imageName}/${resolution}/${hash.substring(0, 32)}.jpg`,
      };
    }),
    createdAt,
    updatedAt,
  };
}

function generateFailedTask(index: number, createdAt: Date): SeedTask {
  const updatedAt = new Date(createdAt.getTime() + Math.random() * 60000 + 10000); // 10-70 seconds after creation
  return {
    _id: randomUUID(),
    status: 'failed',
    price: randomPrice(),
    originalPath: sampleImageUrls[index % sampleImageUrls.length],
    images: [],
    errorMessage: errorMessages[Math.floor(Math.random() * errorMessages.length)],
    createdAt,
    updatedAt,
  };
}

function generatePendingTask(index: number, createdAt: Date): SeedTask {
  return {
    _id: randomUUID(),
    status: 'pending',
    price: randomPrice(),
    originalPath: sampleImageUrls[index % sampleImageUrls.length],
    images: [],
    createdAt,
    updatedAt: createdAt,
  };
}

async function seed() {
  console.log('Starting database seeding...');
  console.log(`MongoDB URI: ${config.MONGODB_URI}`);

  const db = DatabaseConnection.getInstance();

  try {
    await db.connect();
    console.log('Connected to database');

    // Clear existing tasks
    const deletedCount = await TaskModel.deleteMany({});
    console.log(`Cleared ${deletedCount.deletedCount} existing tasks`);

    const tasks: SeedTask[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Generate 50 completed tasks
    console.log('Generating completed tasks...');
    for (let i = 0; i < 50; i++) {
      const createdAt = randomDate(thirtyDaysAgo, now);
      tasks.push(generateCompletedTask(i, createdAt));
    }

    // Generate 8 failed tasks
    console.log('Generating failed tasks...');
    for (let i = 50; i < 58; i++) {
      const createdAt = randomDate(thirtyDaysAgo, now);
      tasks.push(generateFailedTask(i, createdAt));
    }

    // Generate 3 pending tasks
    console.log('Generating pending tasks...');
    const recentTime = new Date(now.getTime() - 10 * 60 * 1000);
    for (let i = 58; i < 61; i++) {
      const createdAt = randomDate(recentTime, now);
      tasks.push(generatePendingTask(i, createdAt));
    }

    // Insert all tasks
    console.log(`Inserting ${tasks.length} tasks into database...`);
    await TaskModel.insertMany(tasks);

    // Display statistics
    const completedCount = await TaskModel.countDocuments({ status: 'completed' });
    const failedCount = await TaskModel.countDocuments({ status: 'failed' });
    const pendingCount = await TaskModel.countDocuments({ status: 'pending' });

    console.log('\n✓ Seeding completed successfully!');
    console.log('\nDatabase Statistics:');
    console.log(`  Total tasks: ${tasks.length}`);
    console.log(`  Completed: ${completedCount}`);
    console.log(`  Failed: ${failedCount}`);
    console.log(`  Pending: ${pendingCount}`);

    await db.disconnect();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seed();
