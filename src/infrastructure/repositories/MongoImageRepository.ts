import { ImageRepository } from '../../domain/repositories/ImageRepository';
import { Image } from '../../domain/entities/Image';
import { ImageModel, ImageDocument } from '../persistence/schemas/ImageSchema';

export class MongoImageRepository implements ImageRepository {
  async save(image: Image): Promise<Image> {
    try {
      const imageData = {
        _id: image.id,
        resolution: image.resolution,
        path: image.path,
        md5: image.md5,
        createdAt: image.createdAt,
      };

      // Use findOneAndUpdate with upsert to handle both create and update
      const savedDoc = await ImageModel.findOneAndUpdate(
        { _id: image.id },
        imageData,
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );

      if (!savedDoc) {
        throw new Error('Failed to save image');
      }

      return this.toDomainEntity(savedDoc);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to save image: ${error.message}`);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Image | null> {
    try {
      const imageDoc = await ImageModel.findById(id).exec();

      if (!imageDoc) {
        return null;
      }

      return this.toDomainEntity(imageDoc);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to find image by id: ${error.message}`);
      }
      throw error;
    }
  }

  async findByMd5(md5: string): Promise<Image | null> {
    try {
      const imageDoc = await ImageModel.findOne({ md5 }).exec();

      if (!imageDoc) {
        return null;
      }

      return this.toDomainEntity(imageDoc);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to find image by md5: ${error.message}`);
      }
      throw error;
    }
  }

  async findByResolution(resolution: string): Promise<Image[]> {
    try {
      const imageDocs = await ImageModel.find({ resolution }).exec();

      return imageDocs.map((doc) => this.toDomainEntity(doc));
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to find images by resolution: ${error.message}`);
      }
      throw error;
    }
  }

  private toDomainEntity(doc: ImageDocument): Image {
    return Image.reconstitute(
      doc._id,
      doc.resolution,
      doc.path,
      doc.md5,
      doc.createdAt
    );
  }
}
