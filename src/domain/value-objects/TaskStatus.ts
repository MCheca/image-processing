type TaskStatusValue = 'pending' | 'completed' | 'failed';

export class TaskStatus {
  private constructor(private readonly _value: TaskStatusValue) {}

  static createPending(): TaskStatus {
    return new TaskStatus('pending');
  }

  static createCompleted(): TaskStatus {
    return new TaskStatus('completed');
  }

  static createFailed(): TaskStatus {
    return new TaskStatus('failed');
  }

  static fromString(value: string): TaskStatus {
    if (!this.isValidStatus(value)) {
      throw new Error(`Invalid task status: ${value}`);
    }
    return new TaskStatus(value as TaskStatusValue);
  }

  private static isValidStatus(value: string): value is TaskStatusValue {
    return value === 'pending' || value === 'completed' || value === 'failed';
  }

  get value(): TaskStatusValue {
    return this._value;
  }

  isPending(): boolean {
    return this._value === 'pending';
  }

  isCompleted(): boolean {
    return this._value === 'completed';
  }

  isFailed(): boolean {
    return this._value === 'failed';
  }

  equals(other: TaskStatus): boolean {
    if (!other) {
      return false;
    }
    return this._value === other._value;
  }

  toPending(): TaskStatus {
    if (this.isCompleted()) {
      throw new Error('Cannot transition from completed to pending');
    }
    if (this.isFailed()) {
      throw new Error('Cannot transition from failed to pending');
    }
    return this;
  }

  toCompleted(): TaskStatus {
    if (this.isFailed()) {
      throw new Error('Cannot transition from failed to completed');
    }
    if (this.isCompleted()) {
      return this;
    }
    return TaskStatus.createCompleted();
  }

  toFailed(): TaskStatus {
    if (this.isCompleted()) {
      throw new Error('Cannot transition from completed to failed');
    }
    if (this.isFailed()) {
      return this;
    }
    return TaskStatus.createFailed();
  }

  toString(): string {
    return this._value;
  }

  toJSON(): string {
    return this._value;
  }
}
