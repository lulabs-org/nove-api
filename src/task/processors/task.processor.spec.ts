import { Test, TestingModule } from '@nestjs/testing';
import { TaskProcessor } from './task.processor';
import { TasksRepository } from '../repositories/tasks.repository';
import { TaskExecutionLogsRepository } from '../repositories/task-execution-logs.repository';
import { TaskHandlerRegistry } from '../handlers/task-handler.registry';
import { Job } from 'bullmq';
import { TaskStatus, TaskType } from '@prisma/client';
import { Logger } from '@nestjs/common';

describe('TaskProcessor', () => {
  let processor: TaskProcessor;
  let tasksRepository: jest.Mocked<TasksRepository>;
  let executionLogsRepository: jest.Mocked<TaskExecutionLogsRepository>;
  let handlerRegistry: jest.Mocked<TaskHandlerRegistry>;

  beforeEach(async () => {
    const mockTasksRepository = {
      findById: jest.fn(),
      findByJobIdOrRepeatKey: jest.fn(),
      updateTaskStatus: jest.fn(),
    };

    const mockExecutionLogsRepository = {
      createExecutionLog: jest.fn().mockResolvedValue({}),
      updateExecutionLog: jest.fn().mockResolvedValue({}),
    };

    const mockHandlerRegistry = {
      getHandler: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskProcessor,
        { provide: TasksRepository, useValue: mockTasksRepository },
        { provide: TaskExecutionLogsRepository, useValue: mockExecutionLogsRepository },
        { provide: TaskHandlerRegistry, useValue: mockHandlerRegistry },
      ],
    }).compile();

    processor = module.get<TaskProcessor>(TaskProcessor);
    tasksRepository = module.get(TasksRepository);
    executionLogsRepository = module.get(TaskExecutionLogsRepository);
    handlerRegistry = module.get(TaskHandlerRegistry);

    // Mock logger to avoid cluttering test output
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should throw error if handler is not found', async () => {
      const job = { name: 'unknown-task', id: '1' } as Job;
      handlerRegistry.getHandler.mockReturnValue(undefined);

      await expect(processor.process(job)).rejects.toThrow('No handler registered for task: unknown-task');
      expect(handlerRegistry.getHandler).toHaveBeenCalledWith('unknown-task');
    });

    it('should call handler.handle and return result if handler is found', async () => {
      const job = { name: 'known-task', id: '1' } as Job;
      const mockHandler = { handle: jest.fn().mockResolvedValue('success') };
      handlerRegistry.getHandler.mockReturnValue(mockHandler as any);

      const result = await processor.process(job);

      expect(result).toBe('success');
      expect(handlerRegistry.getHandler).toHaveBeenCalledWith('known-task');
      expect(mockHandler.handle).toHaveBeenCalledWith(job);
    });
  });

  describe('findTaskFromJob (implicitly tested via event handlers)', () => {
    it('should find task by _taskId from job data', async () => {
      const job = { id: '1', data: { _taskId: 'task-123' }, opts: {} } as unknown as Job;
      const mockTask = { id: 'task-123' };
      tasksRepository.findById.mockResolvedValue(mockTask as any);

      await processor.onActive(job);

      expect(tasksRepository.findById).toHaveBeenCalledWith('task-123');
      expect(tasksRepository.updateTaskStatus).toHaveBeenCalledWith('task-123', TaskStatus.RUNNING);
    });

    it('should find task by repeat options key if _taskId is missing', async () => {
      const job = { id: '1', data: {}, opts: { repeat: { key: 'repeat-key' } } } as unknown as Job;
      const mockTask = { id: 'task-123' };
      tasksRepository.findByJobIdOrRepeatKey.mockResolvedValue(mockTask as any);

      await processor.onActive(job);

      expect(tasksRepository.findByJobIdOrRepeatKey).toHaveBeenCalledWith('1', 'repeat-key');
    });

    it('should find task by repeatJobKey if _taskId and repeat options key are missing', async () => {
      const job = { id: '1', data: {}, opts: {}, repeatJobKey: 'repeat-job-key' } as unknown as Job;
      const mockTask = { id: 'task-123' };
      tasksRepository.findByJobIdOrRepeatKey.mockResolvedValue(mockTask as any);

      await processor.onActive(job);

      expect(tasksRepository.findByJobIdOrRepeatKey).toHaveBeenCalledWith('1', 'repeat-job-key');
    });
  });

  describe('onActive', () => {
    it('should update task status to RUNNING and create execution log if task is found', async () => {
      const job = { id: '1', data: { _taskId: 'task-123' }, opts: {} } as unknown as Job;
      const mockTask = { id: 'task-123' };
      tasksRepository.findById.mockResolvedValue(mockTask as any);
      executionLogsRepository.createExecutionLog.mockResolvedValue({} as any);

      await processor.onActive(job);

      expect(tasksRepository.updateTaskStatus).toHaveBeenCalledWith('task-123', TaskStatus.RUNNING);
      expect(executionLogsRepository.createExecutionLog).toHaveBeenCalledWith({
        scheduledTaskId: 'task-123',
        jobId: '1',
        status: TaskStatus.RUNNING,
      });
    });

    it('should not update status or create log if task is not found', async () => {
      const job = { id: '1', data: { _taskId: 'task-unknown' }, opts: {} } as unknown as Job;
      tasksRepository.findById.mockResolvedValue(null);

      await processor.onActive(job);

      expect(tasksRepository.updateTaskStatus).not.toHaveBeenCalled();
      expect(executionLogsRepository.createExecutionLog).not.toHaveBeenCalled();
    });

    it('should catch error if createExecutionLog fails', async () => {
      const job = { id: '1', data: { _taskId: 'task-123' }, opts: {} } as unknown as Job;
      const mockTask = { id: 'task-123' };
      tasksRepository.findById.mockResolvedValue(mockTask as any);
      executionLogsRepository.createExecutionLog.mockRejectedValue(new Error('DB Error'));

      await expect(processor.onActive(job)).resolves.not.toThrow();
      expect(Logger.prototype.error).toHaveBeenCalledWith('Failed to create execution log: DB Error');
    });
  });

  describe('onCompleted', () => {
    it('should update CRON task to SCHEDULED and update execution log', async () => {
      const job = { id: '1', data: { _taskId: 'task-123' }, opts: {} } as unknown as Job;
      const mockTask = { id: 'task-123', type: TaskType.CRON };
      tasksRepository.findById.mockResolvedValue(mockTask as any);
      executionLogsRepository.updateExecutionLog.mockResolvedValue({} as any);

      await processor.onCompleted(job, { result: 'success' });

      expect(tasksRepository.updateTaskStatus).toHaveBeenCalledWith('task-123', TaskStatus.SCHEDULED, null);
      expect(executionLogsRepository.updateExecutionLog).toHaveBeenCalledWith('1', {
        status: TaskStatus.COMPLETED,
        result: { result: 'success' },
        completedAt: expect.any(Date),
      });
    });

    it('should update non-CRON task to COMPLETED and update execution log', async () => {
      const job = { id: '1', data: { _taskId: 'task-123' }, opts: {} } as unknown as Job;
      const mockTask = { id: 'task-123', type: TaskType.ONCE };
      tasksRepository.findById.mockResolvedValue(mockTask as any);
      executionLogsRepository.updateExecutionLog.mockResolvedValue({} as any);

      await processor.onCompleted(job, 'success');

      expect(tasksRepository.updateTaskStatus).toHaveBeenCalledWith('task-123', TaskStatus.COMPLETED, null);
      expect(executionLogsRepository.updateExecutionLog).toHaveBeenCalledWith('1', {
        status: TaskStatus.COMPLETED,
        result: 'success',
        completedAt: expect.any(Date),
      });
    });

    it('should not do anything if task is not found', async () => {
      const job = { id: '1', data: { _taskId: 'task-unknown' }, opts: {} } as unknown as Job;
      tasksRepository.findById.mockResolvedValue(null);

      await processor.onCompleted(job, 'success');

      expect(tasksRepository.updateTaskStatus).not.toHaveBeenCalled();
      expect(executionLogsRepository.updateExecutionLog).not.toHaveBeenCalled();
    });

    it('should catch error if updateExecutionLog fails', async () => {
      const job = { id: '1', data: { _taskId: 'task-123' }, opts: {} } as unknown as Job;
      const mockTask = { id: 'task-123', type: TaskType.ONCE };
      tasksRepository.findById.mockResolvedValue(mockTask as any);
      executionLogsRepository.updateExecutionLog.mockRejectedValue(new Error('DB Error'));

      await expect(processor.onCompleted(job, 'success')).resolves.not.toThrow();
      expect(Logger.prototype.error).toHaveBeenCalledWith('Failed to update execution log: DB Error');
    });
  });

  describe('onFailed', () => {
    it('should update CRON task to SCHEDULED with error message and update execution log', async () => {
      const job = { id: '1', data: { _taskId: 'task-123' }, opts: {} } as unknown as Job;
      const mockTask = { id: 'task-123', type: TaskType.CRON };
      tasksRepository.findById.mockResolvedValue(mockTask as any);
      executionLogsRepository.updateExecutionLog.mockResolvedValue({} as any);
      const error = new Error('Job failed');

      await processor.onFailed(job, error);

      expect(tasksRepository.updateTaskStatus).toHaveBeenCalledWith('task-123', TaskStatus.SCHEDULED, 'Job failed');
      expect(executionLogsRepository.updateExecutionLog).toHaveBeenCalledWith('1', {
        status: TaskStatus.FAILED,
        error: 'Job failed',
        completedAt: expect.any(Date),
      });
    });

    it('should update non-CRON task to FAILED with error message and update execution log', async () => {
      const job = { id: '1', data: { _taskId: 'task-123' }, opts: {} } as unknown as Job;
      const mockTask = { id: 'task-123', type: TaskType.ONCE };
      tasksRepository.findById.mockResolvedValue(mockTask as any);
      executionLogsRepository.updateExecutionLog.mockResolvedValue({} as any);
      const error = new Error('Job failed');

      await processor.onFailed(job, error);

      expect(tasksRepository.updateTaskStatus).toHaveBeenCalledWith('task-123', TaskStatus.FAILED, 'Job failed');
      expect(executionLogsRepository.updateExecutionLog).toHaveBeenCalledWith('1', {
        status: TaskStatus.FAILED,
        error: 'Job failed',
        completedAt: expect.any(Date),
      });
    });

    it('should not do anything if task is not found', async () => {
      const job = { id: '1', data: { _taskId: 'task-unknown' }, opts: {} } as unknown as Job;
      tasksRepository.findById.mockResolvedValue(null);
      const error = new Error('Job failed');

      await processor.onFailed(job, error);

      expect(tasksRepository.updateTaskStatus).not.toHaveBeenCalled();
      expect(executionLogsRepository.updateExecutionLog).not.toHaveBeenCalled();
    });

    it('should catch error if updateExecutionLog fails', async () => {
      const job = { id: '1', data: { _taskId: 'task-123' }, opts: {} } as unknown as Job;
      const mockTask = { id: 'task-123', type: TaskType.ONCE };
      tasksRepository.findById.mockResolvedValue(mockTask as any);
      executionLogsRepository.updateExecutionLog.mockRejectedValue(new Error('DB Error'));
      const error = new Error('Job failed');

      await expect(processor.onFailed(job, error)).resolves.not.toThrow();
      expect(Logger.prototype.error).toHaveBeenCalledWith('Failed to update execution log: DB Error');
    });
  });

  describe('onQueueError', () => {
    it('should log the queue error', () => {
      const error = new Error('Queue issue');
      processor.onQueueError(error);

      expect(Logger.prototype.error).toHaveBeenCalledWith('Queue error: Queue issue');
    });
  });
});
