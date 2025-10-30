import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { MongoImageRepository } from '../../../src/infrastructure/repositories/MongoImageRepository';
import { Image } from '../../../src/domain/entities/Image';

describe('MongoImageRepository - Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let repository: MongoImageRepository;

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect mongoose to the in-memory database
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Disconnect and stop the in-memory MongoDB server
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Create a new repository instance for each test
    repository = new MongoImageRepository();
  });

  describe('save', () => {
    it('should save a new image to MongoDB', async () => {
      const image = Image.create('1024', '/output/test/1024/abc123def456.jpg', 'abc123def456789012345678901234ab');

      const savedImage = await repository.save(image);

      expect(savedImage).toBeDefined();
      expect(savedImage.id).toBe(image.id);
      expect(savedImage.resolution).toBe('1024');
      expect(savedImage.path).toBe('/output/test/1024/abc123def456.jpg');
      expect(savedImage.md5).toBe('abc123def456789012345678901234ab');
      expect(savedImage.createdAt).toBeInstanceOf(Date);
    });

    it('should save multiple images with different resolutions', async () => {
      const image1024 = Image.create('1024', '/output/test/1024/image.jpg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa11');
      const image800 = Image.create('800', '/output/test/800/image.jpg', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb22');
      const image600 = Image.create('600', '/output/test/600/image.jpg', 'cccccccccccccccccccccccccccccc33');

      await repository.save(image1024);
      await repository.save(image800);
      await repository.save(image600);

      const allImages = await mongoose.connection.db
        .collection('images')
        .find({})
        .toArray();
      expect(allImages).toHaveLength(3);
    });

    it('should update an existing image when saved again', async () => {
      const image = Image.create('1024', '/output/test/1024/original.jpg', 'abc123def456789012345678901234ab');
      await repository.save(image);

      // Create a new image with same id but different data (simulating an update)
      const updatedImage = Image.reconstitute(
        image.id,
        '800',
        '/output/test/800/updated.jpg',
        'abc123def456789012345678901234ab',
        image.createdAt
      );

      const savedImage = await repository.save(updatedImage);

      expect(savedImage).toBeDefined();
      expect(savedImage.id).toBe(image.id);
      expect(savedImage.resolution).toBe('800');
      expect(savedImage.path).toBe('/output/test/800/updated.jpg');

      // Verify only one document exists in the database
      const allImages = await mongoose.connection.db
        .collection('images')
        .find({})
        .toArray();
      expect(allImages).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should find an image by id', async () => {
      const image = Image.create('1024', '/output/test/1024/test.jpg', 'abc123def456789012345678901234ab');
      await repository.save(image);

      const foundImage = await repository.findById(image.id);

      expect(foundImage).toBeDefined();
      expect(foundImage).not.toBeNull();
      expect(foundImage!.id).toBe(image.id);
      expect(foundImage!.resolution).toBe('1024');
      expect(foundImage!.path).toBe('/output/test/1024/test.jpg');
      expect(foundImage!.md5).toBe('abc123def456789012345678901234ab');
    });

    it('should return null when image is not found', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';

      const foundImage = await repository.findById(nonExistentId);

      expect(foundImage).toBeNull();
    });
  });

  describe('findByMd5', () => {
    it('should find an image by md5 hash', async () => {
      const md5Hash = 'abc123def456789012345678901234ab';
      const image = Image.create('1024', '/output/test/1024/test.jpg', md5Hash);
      await repository.save(image);

      const foundImage = await repository.findByMd5(md5Hash);

      expect(foundImage).toBeDefined();
      expect(foundImage).not.toBeNull();
      expect(foundImage!.md5).toBe(md5Hash);
      expect(foundImage!.id).toBe(image.id);
    });

    it('should return null when md5 hash is not found', async () => {
      const nonExistentMd5 = 'ffffffffffffffffffffffffffffffff';

      const foundImage = await repository.findByMd5(nonExistentMd5);

      expect(foundImage).toBeNull();
    });

    it('should find the correct image when multiple images exist', async () => {
      const image1 = Image.create('1024', '/output/test/1024/img1.jpg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa11');
      const image2 = Image.create('800', '/output/test/800/img2.jpg', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb22');
      const image3 = Image.create('600', '/output/test/600/img3.jpg', 'cccccccccccccccccccccccccccccc33');

      await repository.save(image1);
      await repository.save(image2);
      await repository.save(image3);

      const foundImage = await repository.findByMd5('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb22');

      expect(foundImage).toBeDefined();
      expect(foundImage!.id).toBe(image2.id);
      expect(foundImage!.resolution).toBe('800');
    });
  });

  describe('findByResolution', () => {
    it('should find all images with a specific resolution', async () => {
      const image1 = Image.create('1024', '/output/test1/1024/img1.jpg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa11');
      const image2 = Image.create('1024', '/output/test2/1024/img2.jpg', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb22');
      const image3 = Image.create('800', '/output/test3/800/img3.jpg', 'cccccccccccccccccccccccccccccc33');

      await repository.save(image1);
      await repository.save(image2);
      await repository.save(image3);

      const images1024 = await repository.findByResolution('1024');

      expect(images1024).toBeDefined();
      expect(images1024).toHaveLength(2);
      expect(images1024[0].resolution).toBe('1024');
      expect(images1024[1].resolution).toBe('1024');

      // Verify both images are included
      const imageIds = images1024.map(img => img.id);
      expect(imageIds).toContain(image1.id);
      expect(imageIds).toContain(image2.id);
    });

    it('should return empty array when no images match the resolution', async () => {
      const image = Image.create('1024', '/output/test/1024/img.jpg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa11');
      await repository.save(image);

      const images800 = await repository.findByResolution('800');

      expect(images800).toBeDefined();
      expect(images800).toHaveLength(0);
    });

    it('should return empty array when no images exist', async () => {
      const images = await repository.findByResolution('1024');

      expect(images).toBeDefined();
      expect(images).toHaveLength(0);
    });
  });

  describe('data persistence and consistency', () => {
    it('should maintain data consistency across save and find operations', async () => {
      const originalImage = Image.create('1024', '/output/test/1024/test.jpg', 'abc123def456789012345678901234ab');

      await repository.save(originalImage);

      const retrievedImage = await repository.findById(originalImage.id);

      expect(retrievedImage).toBeDefined();
      expect(retrievedImage!.id).toBe(originalImage.id);
      expect(retrievedImage!.resolution).toBe(originalImage.resolution);
      expect(retrievedImage!.path).toBe(originalImage.path);
      expect(retrievedImage!.md5).toBe(originalImage.md5);
      // Allow for small timestamp differences due to MongoDB precision (within 10ms)
      expect(Math.abs(retrievedImage!.createdAt.getTime() - originalImage.createdAt.getTime())).toBeLessThan(10);
    });

    it('should correctly handle special characters in paths', async () => {
      const specialPath = '/output/test with spaces/1024/file-name_2024.jpg';
      const image = Image.create('1024', specialPath, 'abc123def456789012345678901234ab');

      await repository.save(image);
      const retrievedImage = await repository.findById(image.id);

      expect(retrievedImage).toBeDefined();
      expect(retrievedImage!.path).toBe(specialPath);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully on save', async () => {
      const image = Image.create('1024', '/output/test/1024/test.jpg', 'abc123def456789012345678901234ab');
      await mongoose.disconnect();

      await expect(repository.save(image)).rejects.toThrow();

      // Cleanup - reconnect for other tests
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    });

    it('should handle database connection errors gracefully on findById', async () => {
      const image = Image.create('1024', '/output/test/1024/test.jpg', 'abc123def456789012345678901234ab');
      await repository.save(image);
      await mongoose.disconnect();

      await expect(repository.findById(image.id)).rejects.toThrow();

      // Cleanup - reconnect for other tests
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    });

    it('should handle database connection errors gracefully on findByMd5', async () => {
      await mongoose.disconnect();

      await expect(repository.findByMd5('abc123def456789012345678901234ab')).rejects.toThrow();

      // Cleanup - reconnect for other tests
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    });

    it('should handle database connection errors gracefully on findByResolution', async () => {
      await mongoose.disconnect();

      await expect(repository.findByResolution('1024')).rejects.toThrow();

      // Cleanup - reconnect for other tests
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    });
  });
});
