import { Schema, model, Document } from 'mongoose';

export interface TaskImageDocument {
  resolution: string;
  path: string;
}

export interface TaskDocument extends Document {
  _id: string;
  status: 'pending' | 'completed' | 'failed';
  price: number;
  createdAt: Date;
  updatedAt: Date;
  originalPath: string;
  images: TaskImageDocument[];
  errorMessage?: string;
}

const taskImageSchema = new Schema<TaskImageDocument>(
  {
    resolution: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const taskSchema = new Schema<TaskDocument>(
  {
    _id: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'completed', 'failed'],
    },
    price: {
      type: Number,
      required: true,
      min: 5,
      max: 50,
    },
    originalPath: {
      type: String,
      required: true,
    },
    images: {
      type: [taskImageSchema],
      default: [],
    },
    errorMessage: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'tasks',
  }
);

export const TaskModel = model<TaskDocument>('Task', taskSchema);
