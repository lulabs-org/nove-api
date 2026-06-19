import {
  Processor,
  WorkerHost,
  OnWorkerEvent,
  OnQueueEvent,
} from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { TasksRepository } from '../repositories/tasks.repository';
import { TaskHandlerRegistry } from '../handlers/task-handler.registry';
import { TASK_QUEUE_NAME } from '../task.constants';

@Injectable()
@Processor(TASK_QUEUE_NAME)
export class TaskProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskProcessor.name);

  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly registry: TaskHandlerRegistry,
  ) {
    super();
  }

  override async process(
    job: Job<Record<string, unknown>, unknown, string>,
  ): Promise<unknown> {
    const taskName = job.data.originalName ?? job.name;
    this.logger.log(`Processing job name=${JSON.stringify(taskName)} id=${job.id}`);

    const handler = this.registry.getHandler(taskName as string);
    if (!handler) {
      this.logger.warn(`Unknown job type or no handler registered: ${JSON.stringify(taskName)}`);
      // Throwing an error will automatically mark the job as failed in BullMQ
      throw new Error(`No handler registered for task: ${taskName}`);
    }

    // Hand over the execution to the registered handler
    const result = await handler.handle(job);
    return result;
  }

  @OnWorkerEvent('active')
  async onActive(job: Job): Promise<void> {
    const repeatKey = job.opts.repeat?.key ?? (job as any).repeatJobKey;
    const task = await this.tasksRepository.findByJobIdOrRepeatKey(String(job.id), repeatKey);
    
    if (task) {
      await this.tasksRepository.updateTaskStatus(task.id, TaskStatus.RUNNING);
      
      // Create execution log
      await this.tasksRepository.createExecutionLog({
        scheduledTaskId: task.id,
        jobId: String(job.id),
        status: TaskStatus.RUNNING,
      }).catch(err => this.logger.error(`Failed to create execution log: ${err.message}`));
    }
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job, result: unknown): Promise<void> {
    this.logger.log(`Job ${job.id} completed: ${JSON.stringify(result)}`);
    const repeatKey = job.opts.repeat?.key ?? (job as any).repeatJobKey;
    const task = await this.tasksRepository.findByJobIdOrRepeatKey(String(job.id), repeatKey);

    if (task) {
      await this.tasksRepository.updateTaskStatus(task.id, TaskStatus.COMPLETED, null);
      
      await this.tasksRepository.updateExecutionLog(String(job.id), {
        status: TaskStatus.COMPLETED,
        result: result as any,
        completedAt: new Date(),
      }).catch(err => this.logger.error(`Failed to update execution log: ${err.message}`));
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, err: Error): Promise<void> {
    this.logger.error(`Job ${job.id} failed: ${err.message}`);
    const repeatKey = job.opts.repeat?.key ?? (job as any).repeatJobKey;
    const task = await this.tasksRepository.findByJobIdOrRepeatKey(String(job.id), repeatKey);

    if (task) {
      await this.tasksRepository.updateTaskStatus(task.id, TaskStatus.FAILED, err.message);
      
      await this.tasksRepository.updateExecutionLog(String(job.id), {
        status: TaskStatus.FAILED,
        error: err.message,
        completedAt: new Date(),
      }).catch(err => this.logger.error(`Failed to update execution log: ${err.message}`));
    }
  }

  @OnQueueEvent('error')
  onQueueError(err: Error): void {
    this.logger.error(`Queue error: ${err.message}`);
  }
}
