import { TaskStatus } from '../value-objects/TaskStatus';
import { Price } from '../value-objects/Price';
import { randomUUID } from 'crypto';

export interface TaskImage {
  resolution: string;
  path: string;
}

interface TaskProps {
  id: string;
  status: TaskStatus;
  price: Price;
  createdAt: Date;
  updatedAt: Date;
  originalPath: string;
  images: TaskImage[];
  errorMessage?: string;
}

export class Task {
  private constructor(private readonly props: TaskProps) {}

  static create(originalPath: string): Task {
    if (!originalPath || originalPath.trim() === '') {
      throw new Error('Original path cannot be empty');
    }

    const now = new Date();

    return new Task({
      id: randomUUID(),
      status: TaskStatus.createPending(),
      price: Price.createRandom(),
      createdAt: now,
      updatedAt: now,
      originalPath: originalPath.trim(),
      images: [],
    });
  }

  static reconstitute(
    id: string,
    status: TaskStatus,
    price: Price,
    createdAt: Date,
    updatedAt: Date,
    originalPath: string,
    images: TaskImage[],
    errorMessage?: string
  ): Task {
    return new Task({
      id,
      status,
      price,
      createdAt,
      updatedAt,
      originalPath,
      images: [...images],
      errorMessage,
    });
  }

  complete(images: TaskImage[]): Task {
    if (this.props.status.isCompleted()) {
      throw new Error('Task is already completed');
    }

    if (!images || images.length === 0) {
      throw new Error('Cannot complete task without images');
    }

    this.validateImages(images);

    return new Task({
      ...this.props,
      status: this.props.status.toCompleted(),
      images: [...images],
      updatedAt: new Date(),
    });
  }

  fail(errorMessage: string): Task {
    if (!errorMessage || errorMessage.trim() === '') {
      throw new Error('Error message cannot be empty');
    }

    return new Task({
      ...this.props,
      status: this.props.status.toFailed(),
      errorMessage: errorMessage.trim(),
      updatedAt: new Date(),
    });
  }

  private validateImages(images: TaskImage[]): void {
    for (const image of images) {
      if (!image.hasOwnProperty('resolution') || !image.hasOwnProperty('path')) {
        throw new Error('Invalid image structure');
      }
      if (!image.resolution || image.resolution.trim() === '') {
        throw new Error('Image resolution cannot be empty');
      }
      if (!image.path || image.path.trim() === '') {
        throw new Error('Image path cannot be empty');
      }
    }
  }

  get id(): string {
    return this.props.id;
  }

  get status(): TaskStatus {
    return this.props.status;
  }

  get price(): Price {
    return this.props.price;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get originalPath(): string {
    return this.props.originalPath;
  }

  get images(): TaskImage[] {
    return [...this.props.images];
  }

  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  toObject(): {
    id: string;
    status: string;
    price: number;
    createdAt: Date;
    updatedAt: Date;
    originalPath: string;
    images: TaskImage[];
    errorMessage?: string;
  } {
    const obj: any = {
      id: this.props.id,
      status: this.props.status.value,
      price: this.props.price.value,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      originalPath: this.props.originalPath,
      images: [...this.props.images],
    };

    if (this.props.errorMessage) {
      obj.errorMessage = this.props.errorMessage;
    }

    return obj;
  }
}
