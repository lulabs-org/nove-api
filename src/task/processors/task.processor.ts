import {
  Processor,
  WorkerHost,
  OnWorkerEvent,
  OnQueueEvent,
} from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import {
  TaskStatus,
  TaskType,
  ScheduledTask,
  Prisma,
} from '@/generated/prisma/client';
import { TasksRepository } from '../repositories/tasks.repository';
import { TaskExecutionLogsRepository } from '../repositories/task-execution-logs.repository';
import { TaskHandlerRegistry } from '../handlers/task-handler.registry';
import { TASK_QUEUE_NAME } from '../task.constants';

/**
 * Task Queue Consumer Processor (BullMQ Worker)
 *
 * Responsible for consuming and processing jobs from the designated queue:
 * - Lazy Worker startup (explicitly started after application bootstrap);
 * - Dispatches jobs to corresponding TaskHandler based on job name;
 * - Listens to job lifecycle events (active, completed, failed, error);
 * - Synchronously updates task status in the database (RUNNING, COMPLETED, FAILED, SCHEDULED);
 * - Records and maintains detailed execution logs for each job execution (TaskExecutionLog).
 */
@Injectable()
@Processor(TASK_QUEUE_NAME, {
  // Set autorun to false; manually started by onApplicationBootstrap to ensure all dependencies are ready before consuming
  autorun: false,
})
export class TaskProcessor
  extends WorkerHost
  implements OnApplicationBootstrap
{
  private readonly logger = new Logger(TaskProcessor.name);

  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly taskExecutionLogsRepository: TaskExecutionLogsRepository,
    private readonly registry: TaskHandlerRegistry,
  ) {
    super();
  }

  /**
   * Application bootstrap hook.
   *
   * Explicitly starts the BullMQ Worker after NestJS application initialization is complete,
   * avoiding premature consumption of queue jobs before all services are ready.
   */
  onApplicationBootstrap() {
    this.logger.log('Starting BullMQ worker...');
    this.worker.run().catch((err) => {
      this.logger.error('BullMQ worker encountered an error', err);
    });
  }

  /**
   * Finds the associated database task record for a BullMQ Job.
   *
   * @description
   * 1. Primary lookup: uses `_taskId` injected in the Job payload for fast and exact lookup;
   * 2. Fallback lookup: queries by jobId or repeatKey (for backward compatibility).
   *
   * @param job The current BullMQ Job being processed
   * @returns The matched ScheduledTask database entity, or null if not found
   */
  private async findTaskFromJob(job: Job): Promise<ScheduledTask | null> {
    const jobData = job.data as Record<string, unknown> | undefined;
    // 1. Primary lookup using _taskId injected by TasksService during scheduling
    const taskId =
      typeof jobData?._taskId === 'string' ? jobData._taskId : undefined;
    if (taskId) {
      return this.tasksRepository.findById(taskId);
    }

    // 2. Fallback: extract repeatKey or query by jobId
    const repeatOptions = job.opts.repeat as { key?: string } | undefined;
    const repeatKey =
      repeatOptions?.key ??
      (job as unknown as { repeatJobKey?: string }).repeatJobKey;
    return this.tasksRepository.findByJobIdOrRepeatKey(
      String(job.id),
      repeatKey,
    );
  }

  /**
   * Core task consumption and processing method.
   *
   * @description
   * 1. Extracts the job name (representing the handler identifier);
   * 2. Retrieves the corresponding business processor (TaskHandler) from the registry;
   * 3. If no handler is found, logs a warning and throws an error (marking the job as failed in BullMQ);
   * 4. Calls handler.handle(job) to execute business logic and returns the result.
   *
   * @param job The BullMQ job currently being processed
   * @returns The execution result returned by the task handler
   */
  override async process(
    job: Job<Record<string, unknown>, unknown, string>,
  ): Promise<unknown> {
    const taskName = job.name;
    this.logger.log(
      `Processing job name=${JSON.stringify(taskName)} id=${job.id}`,
    );

    // Resolve the corresponding task handler from the registry
    const handler = this.registry.getHandler(taskName);
    if (!handler) {
      this.logger.warn(
        `Unknown job type or no handler registered: ${JSON.stringify(taskName)}`,
      );
      // Throwing an error causes BullMQ to mark the job as failed
      throw new Error(`No handler registered for task: ${taskName}`);
    }

    // Delegate execution to the specific handler
    const result = await handler.handle(job);
    return result;
  }

  /**
   * Event listener for job execution start.
   *
   * @description
   * 1. Queries the associated database task record for the job;
   * 2. Updates the task status to RUNNING;
   * 3. Creates an initial execution log record with status RUNNING.
   *
   * @param job The BullMQ Job that started execution
   */
  @OnWorkerEvent('active')
  async onActive(job: Job): Promise<void> {
    const task = await this.findTaskFromJob(job);

    if (task) {
      // 1. Update main task status to RUNNING
      await this.tasksRepository.updateTaskStatus(task.id, TaskStatus.RUNNING);

      // 2. Initialize persistent execution log record
      await this.taskExecutionLogsRepository
        .createExecutionLog({
          scheduledTaskId: task.id,
          jobId: String(job.id),
          status: TaskStatus.RUNNING,
        })
        .catch((err: Error) =>
          this.logger.error(`Failed to create execution log: ${err.message}`),
        );
    }
  }

  /**
   * Event listener for successful job completion.
   *
   * @description
   * 1. Logs completion and queries the associated database task record;
   * 2. State transition:
   *    - CRON tasks: reset status back to SCHEDULED (if not paused) awaiting next trigger;
   *    - ONCE tasks: mark as final state COMPLETED;
   * 3. Updates the execution log: sets status to COMPLETED, records execution result and completion timestamp.
   *
   * @param job The BullMQ Job that finished successfully
   * @param result Execution result returned by the handler
   */
  @OnWorkerEvent('completed')
  async onCompleted(job: Job, result: unknown): Promise<void> {
    this.logger.log(`Job ${job.id} completed: ${JSON.stringify(result)}`);
    const task = await this.findTaskFromJob(job);

    if (task) {
      // 1. Update task status based on task type
      if (task.type === TaskType.CRON) {
        // Reset recurring tasks back to SCHEDULED if not paused, awaiting next trigger
        if (task.status !== TaskStatus.PAUSED) {
          await this.tasksRepository.updateTaskStatus(
            task.id,
            TaskStatus.SCHEDULED,
            null,
          );
        }
      } else {
        // Mark one-time task as completed
        await this.tasksRepository.updateTaskStatus(
          task.id,
          TaskStatus.COMPLETED,
          null,
        );
      }

      // 2. Update execution log record
      await this.taskExecutionLogsRepository
        .updateExecutionLog(String(job.id), {
          status: TaskStatus.COMPLETED,
          result: result as Prisma.InputJsonValue,
          completedAt: new Date(),
        })
        .catch((err: Error) =>
          this.logger.error(`Failed to update execution log: ${err.message}`),
        );
    }
  }

  /**
   * Event listener for job execution failure.
   *
   * @description
   * 1. Logs error and queries the associated database task record;
   * 2. State transition:
   *    - CRON tasks: keep status as SCHEDULED (with error message) so subsequent runs are not blocked;
   *    - ONCE tasks: mark as FAILED with error details;
   * 3. Updates execution log: sets status to FAILED, records error message and completion timestamp.
   *
   * @param job The failed BullMQ Job
   * @param err The caught error object
   */
  @OnWorkerEvent('failed')
  async onFailed(job: Job, err: Error): Promise<void> {
    this.logger.error(`Job ${job.id} failed: ${err.message}`);
    const task = await this.findTaskFromJob(job);

    if (task) {
      // 1. Update failure status based on task type
      if (task.type === TaskType.CRON) {
        // Retain SCHEDULED status for CRON tasks to ensure subsequent triggers continue running
        await this.tasksRepository.updateTaskStatus(
          task.id,
          TaskStatus.SCHEDULED,
          err.message,
        );
      } else {
        // Mark one-time task as failed
        await this.tasksRepository.updateTaskStatus(
          task.id,
          TaskStatus.FAILED,
          err.message,
        );
      }

      // 2. Update execution log record
      await this.taskExecutionLogsRepository
        .updateExecutionLog(String(job.id), {
          status: TaskStatus.FAILED,
          error: err.message,
          completedAt: new Date(),
        })
        .catch((err: Error) =>
          this.logger.error(`Failed to update execution log: ${err.message}`),
        );
    }
  }

  /**
   * Event listener for queue-level errors.
   *
   * Catches and logs Redis connection anomalies or BullMQ internal errors.
   *
   * @param err The queue error object
   */
  @OnQueueEvent('error')
  onQueueError(err: Error): void {
    this.logger.error(`Queue error: ${err.message}`);
  }
}
