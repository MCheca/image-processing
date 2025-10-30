import { Image } from '../entities/Image';

export interface ImageRepository {
  save(image: Image): Promise<Image>;
  findById(id: string): Promise<Image | null>;
  findByMd5(md5: string): Promise<Image | null>;
  findByResolution(resolution: string): Promise<Image[]>;
}
