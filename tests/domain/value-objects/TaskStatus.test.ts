import { TaskStatus } from '../../../src/domain/value-objects/TaskStatus';

describe('TaskStatus Value Object', () => {
  describe('creation', () => {
    it('should create a TaskStatus with pending status', () => {
      const status = TaskStatus.createPending();

      expect(status.value).toBe('pending');
      expect(status.isPending()).toBe(true);
      expect(status.isCompleted()).toBe(false);
      expect(status.isFailed()).toBe(false);
    });

    it('should create a TaskStatus with completed status', () => {
      const status = TaskStatus.createCompleted();

      expect(status.value).toBe('completed');
      expect(status.isPending()).toBe(false);
      expect(status.isCompleted()).toBe(true);
      expect(status.isFailed()).toBe(false);
    });

    it('should create a TaskStatus with failed status', () => {
      const status = TaskStatus.createFailed();

      expect(status.value).toBe('failed');
      expect(status.isPending()).toBe(false);
      expect(status.isCompleted()).toBe(false);
      expect(status.isFailed()).toBe(true);
    });

    it('should create a TaskStatus from a valid string value', () => {
      const pendingStatus = TaskStatus.fromString('pending');
      const completedStatus = TaskStatus.fromString('completed');
      const failedStatus = TaskStatus.fromString('failed');

      expect(pendingStatus.value).toBe('pending');
      expect(completedStatus.value).toBe('completed');
      expect(failedStatus.value).toBe('failed');
    });

    it('should throw error when creating from invalid string value', () => {
      expect(() => TaskStatus.fromString('invalid')).toThrow('Invalid task status: invalid');
      expect(() => TaskStatus.fromString('')).toThrow('Invalid task status: ');
      expect(() => TaskStatus.fromString('PENDING')).toThrow('Invalid task status: PENDING');
    });
  });

  describe('equality', () => {
    it('should be equal when both have same status value', () => {
      const status1 = TaskStatus.createPending();
      const status2 = TaskStatus.createPending();

      expect(status1.equals(status2)).toBe(true);
    });

    it('should not be equal when status values differ', () => {
      const pending = TaskStatus.createPending();
      const completed = TaskStatus.createCompleted();
      const failed = TaskStatus.createFailed();

      expect(pending.equals(completed)).toBe(false);
      expect(pending.equals(failed)).toBe(false);
      expect(completed.equals(failed)).toBe(false);
    });

    it('should return false when comparing with null or undefined', () => {
      const status = TaskStatus.createPending();

      expect(status.equals(null as any)).toBe(false);
      expect(status.equals(undefined as any)).toBe(false);
    });
  });

  describe('state transitions', () => {
    it('should transition from pending to completed', () => {
      const pending = TaskStatus.createPending();
      const completed = pending.toCompleted();

      expect(completed.isCompleted()).toBe(true);
      expect(pending.isPending()).toBe(true); // Original should remain unchanged
    });

    it('should transition from pending to failed', () => {
      const pending = TaskStatus.createPending();
      const failed = pending.toFailed();

      expect(failed.isFailed()).toBe(true);
      expect(pending.isPending()).toBe(true); // Original should remain unchanged
    });

    it('should throw error when transitioning from completed to pending', () => {
      const completed = TaskStatus.createCompleted();

      expect(() => completed.toPending()).toThrow('Cannot transition from completed to pending');
    });

    it('should throw error when transitioning from failed to pending', () => {
      const failed = TaskStatus.createFailed();

      expect(() => failed.toPending()).toThrow('Cannot transition from failed to pending');
    });

    it('should throw error when transitioning from completed to failed', () => {
      const completed = TaskStatus.createCompleted();

      expect(() => completed.toFailed()).toThrow('Cannot transition from completed to failed');
    });

    it('should throw error when transitioning from failed to completed', () => {
      const failed = TaskStatus.createFailed();

      expect(() => failed.toCompleted()).toThrow('Cannot transition from failed to completed');
    });

    it('should be idempotent when transitioning to same state', () => {
      const pending = TaskStatus.createPending();
      const stillPending = pending.toPending();

      expect(stillPending.isPending()).toBe(true);
      expect(stillPending.equals(pending)).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize to string', () => {
      expect(TaskStatus.createPending().toString()).toBe('pending');
      expect(TaskStatus.createCompleted().toString()).toBe('completed');
      expect(TaskStatus.createFailed().toString()).toBe('failed');
    });

    it('should serialize to JSON', () => {
      expect(TaskStatus.createPending().toJSON()).toBe('pending');
      expect(TaskStatus.createCompleted().toJSON()).toBe('completed');
      expect(TaskStatus.createFailed().toJSON()).toBe('failed');
    });
  });

  describe('immutability', () => {
    it('should be immutable - transitions return new instances', () => {
      const original = TaskStatus.createPending();
      const completed = original.toCompleted();

      expect(original).not.toBe(completed);
      expect(original.isPending()).toBe(true);
      expect(completed.isCompleted()).toBe(true);
    });
  });
});
