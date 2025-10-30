import { Image } from '../../../src/domain/entities/Image';

describe('Image Entity', () => {
  describe('creation', () => {
    it('should create a new Image with all required properties', () => {
      const resolution = '1024';
      const path = '/output/image1/1024/f322b730b287da77e1c519c7ffef4fc2.jpg';
      const md5 = 'f322b730b287da77e1c519c7ffef4fc2';

      const image = Image.create(resolution, path, md5);

      expect(image.id).toBeDefined();
      expect(image.resolution).toBe(resolution);
      expect(image.path).toBe(path);
      expect(image.md5).toBe(md5);
      expect(image.createdAt).toBeInstanceOf(Date);
    });

    it('should create different IDs for different images', () => {
      const image1 = Image.create('1024', '/output/image1/1024/hash1.jpg', 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6');
      const image2 = Image.create('800', '/output/image1/800/hash2.jpg', 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7');

      expect(image1.id).not.toBe(image2.id);
    });

    it('should throw error when resolution is empty', () => {
      expect(() => Image.create('', '/path/to/image.jpg', 'hash')).toThrow(
        'Resolution cannot be empty'
      );
    });

    it('should throw error when resolution is only whitespace', () => {
      expect(() => Image.create('   ', '/path/to/image.jpg', 'hash')).toThrow(
        'Resolution cannot be empty'
      );
    });

    it('should throw error when path is empty', () => {
      expect(() => Image.create('1024', '', 'hash')).toThrow('Path cannot be empty');
    });

    it('should throw error when path is only whitespace', () => {
      expect(() => Image.create('1024', '   ', 'hash')).toThrow('Path cannot be empty');
    });

    it('should throw error when md5 is empty', () => {
      expect(() => Image.create('1024', '/path/to/image.jpg', '')).toThrow(
        'MD5 hash cannot be empty'
      );
    });

    it('should throw error when md5 is only whitespace', () => {
      expect(() => Image.create('1024', '/path/to/image.jpg', '   ')).toThrow(
        'MD5 hash cannot be empty'
      );
    });

    it('should trim whitespace from resolution, path, and md5', () => {
      const image = Image.create('  1024  ', '  /path/to/image.jpg  ', '  a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6  ');

      expect(image.resolution).toBe('1024');
      expect(image.path).toBe('/path/to/image.jpg');
      expect(image.md5).toBe('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6');
    });
  });

  describe('resolution validation', () => {
    it('should accept valid numeric width resolutions', () => {
      const image1 = Image.create('1024', '/path/image.jpg', 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6');
      const image2 = Image.create('800', '/path/image.jpg', 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7');
      const image3 = Image.create('1920', '/path/image.jpg', 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8');

      expect(image1.resolution).toBe('1024');
      expect(image2.resolution).toBe('800');
      expect(image3.resolution).toBe('1920');
    });
  });

  describe('md5 validation', () => {
    it('should accept valid MD5 hash (32 hexadecimal characters)', () => {
      const validMd5 = 'f322b730b287da77e1c519c7ffef4fc2';
      const image = Image.create('1024', '/path/image.jpg', validMd5);

      expect(image.md5).toBe(validMd5);
    });

    it('should throw error when MD5 format is invalid (not 32 hex characters)', () => {
      expect(() => Image.create('1024', '/path/image.jpg', 'invalid')).toThrow(
        'Invalid MD5 hash format'
      );
    });

    it('should throw error when MD5 has incorrect length', () => {
      expect(() =>
        Image.create('1024', '/path/image.jpg', 'f322b730b287da77e1c519c7ffef4fc')
      ).toThrow('Invalid MD5 hash format');
    });

    it('should throw error when MD5 contains non-hexadecimal characters', () => {
      expect(() =>
        Image.create('1024', '/path/image.jpg', 'g322b730b287da77e1c519c7ffef4fc2')
      ).toThrow('Invalid MD5 hash format');
    });

    it('should accept both lowercase and uppercase MD5 hashes', () => {
      const lowerCaseMd5 = 'f322b730b287da77e1c519c7ffef4fc2';
      const upperCaseMd5 = 'F322B730B287DA77E1C519C7FFEF4FC2';

      const image1 = Image.create('1024', '/path/image1.jpg', lowerCaseMd5);
      const image2 = Image.create('1024', '/path/image2.jpg', upperCaseMd5);

      expect(image1.md5).toBe(lowerCaseMd5);
      expect(image2.md5).toBe(upperCaseMd5);
    });
  });

  describe('reconstitution from persistence', () => {
    it('should reconstitute an image from stored data', () => {
      const id = '65d4a54b89c5e342b2c2c5f7';
      const resolution = '1024';
      const path = '/output/image1/1024/hash.jpg';
      const md5 = 'f322b730b287da77e1c519c7ffef4fc2';
      const createdAt = new Date('2024-06-01T12:00:00Z');

      const image = Image.reconstitute(id, resolution, path, md5, createdAt);

      expect(image.id).toBe(id);
      expect(image.resolution).toBe(resolution);
      expect(image.path).toBe(path);
      expect(image.md5).toBe(md5);
      expect(image.createdAt).toBe(createdAt);
    });
  });

  describe('path operations', () => {
    it('should extract filename from path', () => {
      const image = Image.create(
        '1024',
        '/output/image1/1024/f322b730b287da77e1c519c7ffef4fc2.jpg',
        'f322b730b287da77e1c519c7ffef4fc2'
      );

      expect(image.getFileName()).toBe('f322b730b287da77e1c519c7ffef4fc2.jpg');
    });

    it('should extract file extension from path', () => {
      const jpgImage = Image.create('1024', '/path/image.jpg', 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6');
      const pngImage = Image.create('1024', '/path/image.png', 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7');
      const webpImage = Image.create('1024', '/path/image.webp', 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8');

      expect(jpgImage.getExtension()).toBe('jpg');
      expect(pngImage.getExtension()).toBe('png');
      expect(webpImage.getExtension()).toBe('webp');
    });

    it('should return empty string for extension when no extension exists', () => {
      const image = Image.create('1024', '/path/image', 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6');

      expect(image.getExtension()).toBe('');
    });
  });

  describe('equality', () => {
    it('should be equal when comparing same instance', () => {
      const image = Image.create('1024', '/path/image.jpg', 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6');

      expect(image.equals(image)).toBe(true);
    });

    it('should be equal when IDs match', () => {
      const id = '65d4a54b89c5e342b2c2c5f7';
      const createdAt = new Date();
      const image1 = Image.reconstitute(id, '1024', '/path/image1.jpg', 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6', createdAt);
      const image2 = Image.reconstitute(id, '800', '/path/image2.jpg', 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', createdAt);

      expect(image1.equals(image2)).toBe(true);
    });

    it('should not be equal when IDs differ', () => {
      const image1 = Image.create('1024', '/path/image1.jpg', 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6');
      const image2 = Image.create('1024', '/path/image2.jpg', 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7');

      expect(image1.equals(image2)).toBe(false);
    });

    it('should return false when comparing with null or undefined', () => {
      const image = Image.create('1024', '/path/image.jpg', 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6');

      expect(image.equals(null as any)).toBe(false);
      expect(image.equals(undefined as any)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to plain object for persistence', () => {
      const image = Image.create(
        '1024',
        '/output/image1/1024/hash.jpg',
        'f322b730b287da77e1c519c7ffef4fc2'
      );

      const plainObject = image.toObject();

      expect(plainObject).toEqual({
        id: image.id,
        resolution: '1024',
        path: '/output/image1/1024/hash.jpg',
        md5: 'f322b730b287da77e1c519c7ffef4fc2',
        createdAt: image.createdAt,
      });
    });

    it('should convert to simple DTO for API responses', () => {
      const image = Image.create(
        '1024',
        '/output/image1/1024/hash.jpg',
        'f322b730b287da77e1c519c7ffef4fc2'
      );

      const dto = image.toDTO();

      expect(dto).toEqual({
        resolution: '1024',
        path: '/output/image1/1024/hash.jpg',
      });
    });
  });
});
