export interface ITaskQueue {
  addTask(taskId: string, imagePath: string): Promise<void>;
}
