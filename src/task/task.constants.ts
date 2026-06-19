// src/task/task.constants.ts

export const TASK_QUEUE_NAME = 'tasks';

export const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 24 * 3600, count: 1000 },
};
