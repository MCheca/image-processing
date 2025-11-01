import { ITaskQueue } from '../../domain/services/ITaskQueue';
import { ProcessImageUseCase } from '../../application/use-cases/ProcessImageUseCase';

export class SyncTaskQueue implements ITaskQueue {
  constructor(private readonly processImageUseCase: ProcessImageUseCase) {}

  async addTask(taskId: string, _imagePath: string): Promise<void> {
    await this.processImageUseCase.execute({
      taskId,
    });
  }
}
