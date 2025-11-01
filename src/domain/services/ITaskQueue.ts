export interface ITaskQueue {
  addTask(taskId: string, imageSource: string | Buffer, filename?: string): Promise<void>;
}
