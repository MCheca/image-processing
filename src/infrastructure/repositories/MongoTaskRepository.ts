import { TaskRepository } from '../../domain/repositories/TaskRepository';
import { Task, TaskImage } from '../../domain/entities/Task';
import { TaskStatus } from '../../domain/value-objects/TaskStatus';
import { Price } from '../../domain/value-objects/Price';
import { TaskModel, TaskDocument } from '../persistence/schemas/TaskSchema';

export class MongoTaskRepository implements TaskRepository {
  async save(task: Task): Promise<Task> {
    try {
      const taskData = {
        _id: task.id,
        status: task.status.value,
        price: task.price.value,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        originalPath: task.originalPath,
        images: task.images,
        errorMessage: task.errorMessage,
      };

      // Use findOneAndUpdate with upsert to handle both create and update
      const savedDoc = await TaskModel.findOneAndUpdate(
        { _id: task.id },
        taskData,
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );

      if (!savedDoc) {
        throw new Error('Failed to save task');
      }

      return this.toDomainEntity(savedDoc);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to save task: ${error.message}`);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Task | null> {
    try {
      const taskDoc = await TaskModel.findById(id).exec();

      if (!taskDoc) {
        return null;
      }

      return this.toDomainEntity(taskDoc);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to find task: ${error.message}`);
      }
      throw error;
    }
  }

  private toDomainEntity(doc: TaskDocument): Task {
    const status = TaskStatus.fromString(doc.status);
    const price = Price.fromValue(doc.price);

    const images: TaskImage[] = doc.images.map((img) => ({
      resolution: img.resolution,
      path: img.path,
    }));

    return Task.reconstitute(
      doc._id,
      status,
      price,
      doc.createdAt,
      doc.updatedAt,
      doc.originalPath,
      images,
      doc.errorMessage
    );
  }
}
