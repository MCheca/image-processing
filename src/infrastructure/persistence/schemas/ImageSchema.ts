import { Schema, model, Document } from 'mongoose';

export interface ImageDocument extends Document {
  _id: string;
  resolution: string;
  path: string;
  md5: string;
  createdAt: Date;
}

const imageSchema = new Schema<ImageDocument>(
  {
    _id: {
      type: String,
      required: true,
    },
    resolution: {
      type: String,
      required: true,
      index: true,
    },
    path: {
      type: String,
      required: true,
    },
    md5: {
      type: String,
      required: true,
      unique: true, // Unique index for deduplication
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'images',
  }
);

export const ImageModel = model<ImageDocument>('Image', imageSchema);
