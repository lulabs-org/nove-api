// src/tasks/tasks.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue, JobsOptions, RepeatOptions } from 'bullmq';
import { CreateOnceDto } from '../dto/create-once.dto';
import { CreateCronDto } from '../dto/create-cron.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { QueryDto } from '../dto/query.dto';
import { ScheduledTask, TaskStatus, TaskType } from '@/generated/prisma/client';
import { TasksRepository } from '../repositories/tasks.repository';
import { TASK_QUEUE_NAME, DEFAULT_JOB_OPTIONS } from '../task.constants';

/**
 * Core Task Scheduling Service
 *
 * Manages scheduled and recurring tasks across the system, orchestrating between BullMQ queues and Prisma database:
 * - One-time scheduled tasks (TaskType.ONCE): scheduled at a specific point in time using delayed queues
 * - Recurring tasks (TaskType.CRON): scheduled via BullMQ Job Scheduler mechanism
 * - Supports full task lifecycle management: creation, query, update, soft delete, pause, resume, and immediate execution (runNow)
 * - Supports queue-level pause and resume
 */
@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    @InjectQueue(TASK_QUEUE_NAME) private readonly queue: Queue,
  ) {}

  // BullMQ v5 includes built-in scheduling, so no separate QueueScheduler or onModuleInit is needed

  /**
   * Creates a one-time scheduled task (ONCE).
   *
   * @description
   * 1. Creates a task record in the database first to obtain a unique task ID;
   * 2. Calculates delay (target execution time - current time), injects task ID (`_taskId`) into payload, and enqueues to BullMQ;
   * 3. Writes the assigned jobId back to the database;
   * 4. If queue addition fails, rolls back by deleting the newly created database record.
   *
   * @param dto Parameters for creating a one-time task, including runAt, handler, payload, etc.
   * @returns The created task entity bound with jobId
   */
  async createOnce(dto: CreateOnceDto): Promise<ScheduledTask> {
    const runAt = new Date(dto.runAt);

    // 1. Create task record in database first to get the generated task ID
    const task = await this.tasksRepository.create({
      name: dto.name,
      handler: dto.handler,
      type: TaskType.ONCE,
      queueName: this.queue.name,
      payload: dto.payload as unknown as object,
      status: TaskStatus.SCHEDULED,
      runAt,
    });

    // 2. Calculate delay in milliseconds; if time has passed, set delay to 0 (execute immediately)
    const opts: JobsOptions = {
      delay: Math.max(0, runAt.getTime() - Date.now()),
      jobId: task.id,
      ...DEFAULT_JOB_OPTIONS,
    };

    try {
      // 3. Enqueue task to BullMQ with _taskId injected into data for worker lookup
      const job = await this.queue.add(
        dto.handler,
        { ...dto.payload, _taskId: task.id },
        opts,
      );
      // 4. Update the assigned jobId back to the database
      return await this.tasksRepository.update(task.id, {
        jobId: String(job.id ?? opts.jobId),
      });
    } catch (err) {
      // Rollback database record if enqueueing fails
      await this.tasksRepository.delete(task.id);
      throw err;
    }
  }

  /**
   * Creates a recurring Cron scheduled task (CRON).
   *
   * @description
   * 1. Uses provided timezone (defaulting to 'Asia/Shanghai') and persists task record to database;
   * 2. Calls BullMQ `upsertJobScheduler` to register the scheduler using task.id as schedulerId;
   * 3. Updates the task record's jobId (matching task.id);
   * 4. If scheduler registration fails, automatically rolls back by deleting the database record.
   *
   * @param dto Parameters for creating a Cron task, including cron expression, handler, payload, timezone, etc.
   * @param taskId Optional task ID (e.g., for data migration or restoring specific IDs)
   * @returns The created Cron task entity
   */
  async createCron(
    dto: CreateCronDto,
    taskId?: string,
  ): Promise<ScheduledTask> {
    const timezone = dto.timezone ?? 'Asia/Shanghai'; // Use provided timezone or default to Shanghai timezone

    // 1. Persist Cron task record in database
    const task = await this.tasksRepository.create({
      ...(taskId ? { id: taskId } : {}),
      name: dto.name,
      handler: dto.handler,
      type: TaskType.CRON,
      queueName: this.queue.name,
      payload: dto.payload as unknown as object,
      status: TaskStatus.SCHEDULED,
      cron: dto.cron,
      timezone, // Save timezone configuration
    });

    try {
      // 2. Construct BullMQ repeatable job configuration
      const repeat: RepeatOptions = {
        pattern: dto.cron,
        tz: timezone, // Support dynamic timezone specification
      };

      // 3. Register or update BullMQ Job Scheduler (using task.id as schedulerId)
      await this.queue.upsertJobScheduler(task.id, repeat, {
        name: dto.handler,
        data: { ...dto.payload, _taskId: task.id },
        opts: DEFAULT_JOB_OPTIONS,
      });

      // 4. Backfill scheduler ID (task.id) as jobId and reset repeatKey
      return await this.tasksRepository.update(task.id, {
        jobId: task.id, // Scheduler ID matches primary key of task record
        repeatKey: null,
      });
    } catch (err) {
      // Roll back database record if scheduler registration fails
      await this.tasksRepository.delete(task.id);
      throw err;
    }
  }

  /**
   * Queries paginated task list.
   *
   * @description
   * Supports fuzzy search by task name, filtering by status and type, with custom sorting and pagination.
   *
   * @param q Query criteria parameters
   * @returns Paginated result (including items list, total count, current page, and pageSize)
   */
  async list(q: QueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;

    // Build Prisma query filter conditions
    const where = {
      AND: [
        q.search
          ? { name: { contains: q.search, mode: 'insensitive' as const } }
          : {},
        q.status ? { status: q.status as TaskStatus } : {},
        q.type ? { type: q.type as TaskType } : {},
      ],
    };

    // Execute paginated query and total count (soft delete filtering handled by repository)
    const [items, total] = await this.tasksRepository.findManyAndCount({
      where,
      orderBy: { [q.orderBy ?? 'createdAt']: q.orderDir ?? 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  /**
   * Retrieves details of a specific task.
   *
   * @param id Task ID
   * @throws NotFoundException If task does not exist or has been soft-deleted
   * @returns The task entity
   */
  async detail(id: string): Promise<ScheduledTask> {
    return this.tasksRepository.findByIdOrThrow(id);
  }

  /**
   * Updates task configuration.
   *
   * @description
   * - If the task is an active (non-PAUSED) CRON task and cron expression, payload, or timezone changes,
   *   synchronously updates BullMQ scheduler (removes old scheduler and registers new one);
   * - For other cases (such as ONCE tasks or standard property changes), only updates the database record.
   *
   * @param id Task ID
   * @param dto Update data transfer object
   * @returns Updated task entity
   */
  async update(id: string, dto: UpdateTaskDto): Promise<ScheduledTask> {
    const existing = await this.detail(id);
    const newHandler = dto.handler ?? existing.handler;

    // Check if active CRON task has core schedule changes (cron, payload, timezone)
    if (
      existing.type === TaskType.CRON &&
      existing.status !== TaskStatus.PAUSED &&
      ((dto.cron && dto.cron !== existing.cron) ||
        dto.payload !== undefined ||
        (dto.timezone && dto.timezone !== existing.timezone))
    ) {
      const timezone = dto.timezone ?? existing.timezone ?? 'Asia/Shanghai'; // Prioritize new timezone

      // Remove existing Job Scheduler (tolerates case where it does not exist)
      if (existing.jobId) {
        await this.queue
          .removeJobScheduler(existing.jobId)
          .catch(() => undefined);
      }

      // Re-register updated Job Scheduler
      await this.queue.upsertJobScheduler(
        existing.id,
        { pattern: dto.cron ?? existing.cron!, tz: timezone },
        {
          name: newHandler,
          data: {
            ...(dto.payload ?? (existing.payload as Record<string, unknown>)),
            _taskId: existing.id,
          },
          opts: DEFAULT_JOB_OPTIONS,
        },
      );

      // Synchronously update database record
      return this.tasksRepository.update(id, {
        name: dto.name ?? existing.name,
        handler: newHandler,
        cron: dto.cron ?? existing.cron,
        timezone, // Update timezone
        repeatKey: null,
        jobId: existing.id,
        payload: (dto.payload ?? existing.payload) as unknown as object,
        status: dto.status ?? existing.status,
      });
    }

    // Standard property update (no scheduling change or task is currently paused)
    return this.tasksRepository.update(id, {
      name: dto.name ?? existing.name,
      handler: newHandler,
      cron: dto.cron ?? existing.cron,
      timezone: dto.timezone ?? existing.timezone, // Update timezone
      payload: (dto.payload ?? existing.payload) as unknown as object,
      status: dto.status ?? existing.status,
    });
  }

  /**
   * Deletes a task.
   *
   * @description
   * 1. If CRON task, removes the corresponding JobScheduler from BullMQ;
   * 2. If ONCE task, removes unexecuted Job from BullMQ queue;
   * 3. Performs soft deletion on task in database (sets deletedAt).
   *
   * @param id Task ID
   * @returns Operation result { ok: true }
   */
  async remove(id: string): Promise<{ ok: true }> {
    const existing = await this.detail(id);

    // Clean up corresponding job or scheduler from BullMQ
    if (existing.type === TaskType.CRON) {
      if (existing.jobId) {
        await this.queue
          .removeJobScheduler(existing.jobId)
          .catch(() => undefined);
      }
    } else if (existing.jobId) {
      await this.queue.remove(existing.jobId).catch(() => undefined);
    }

    // Database soft delete
    await this.tasksRepository.softDelete(id);
    return { ok: true };
  }

  /**
   * Pauses the task queue.
   *
   * @description
   * 1. Pauses BullMQ queue to stop consuming and processing jobs;
   * 2. Batch updates all SCHEDULED tasks in this queue to PAUSED status.
   *
   * @returns Operation result { ok: true }
   */
  async pauseQueue(): Promise<{ ok: true }> {
    await this.queue.pause();
    await this.tasksRepository.updateMany(
      {
        queueName: this.queue.name,
        status: { in: [TaskStatus.SCHEDULED] },
      },
      { status: TaskStatus.PAUSED },
    );
    return { ok: true };
  }

  /**
   * Resumes the task queue.
   *
   * @description
   * 1. Resumes BullMQ queue consumption;
   * 2. Batch updates all PAUSED tasks in this queue back to SCHEDULED status.
   *
   * @returns Operation result { ok: true }
   */
  async resumeQueue(): Promise<{ ok: true }> {
    await this.queue.resume();
    await this.tasksRepository.updateMany(
      { queueName: this.queue.name, status: TaskStatus.PAUSED },
      { status: TaskStatus.SCHEDULED },
    );
    return { ok: true };
  }

  /**
   * Pauses an individual task.
   *
   * @description
   * 1. Returns immediately if task is already in PAUSED status;
   * 2. If CRON task, removes its JobScheduler from BullMQ;
   * 3. If ONCE task, removes its pending Job from BullMQ;
   * 4. Updates task status in database to PAUSED.
   *
   * @param id Task ID
   * @returns Operation result { ok: true }
   */
  async pauseTask(id: string): Promise<{ ok: true }> {
    const existing = await this.detail(id);
    if (existing.status === TaskStatus.PAUSED) {
      return { ok: true };
    }

    // Remove scheduler or one-time job from queue
    if (existing.type === TaskType.CRON) {
      if (existing.jobId) {
        await this.queue
          .removeJobScheduler(existing.jobId)
          .catch(() => undefined);
      }
    } else if (existing.jobId) {
      await this.queue.remove(existing.jobId).catch(() => undefined);
    }

    // Update database status to PAUSED
    await this.tasksRepository.update(id, { status: TaskStatus.PAUSED });
    return { ok: true };
  }

  /**
   * Resumes an individual paused task.
   *
   * @description
   * 1. Validates task status; ignores if not PAUSED;
   * 2. If CRON task, re-registers to BullMQ via `upsertJobScheduler`;
   * 3. If ONCE task, recalculates remaining delay from current time and re-enqueues Job;
   * 4. Updates database status to SCHEDULED and synchronizes jobId.
   *
   * @param id Task ID
   * @returns Operation result { ok: true }
   */
  async resumeTask(id: string): Promise<{ ok: true }> {
    const existing = await this.detail(id);
    if (existing.status !== TaskStatus.PAUSED) {
      return { ok: true };
    }

    let newJobId = existing.jobId;

    // Resume CRON task scheduling
    if (existing.type === TaskType.CRON && existing.cron) {
      const timezone = existing.timezone ?? 'Asia/Shanghai';
      await this.queue.upsertJobScheduler(
        existing.id,
        { pattern: existing.cron, tz: timezone },
        {
          name: existing.handler,
          data: {
            ...(existing.payload as Record<string, unknown>),
            _taskId: existing.id,
          },
          opts: DEFAULT_JOB_OPTIONS,
        },
      );
      newJobId = existing.id;
    } else if (existing.type === TaskType.ONCE && existing.runAt) {
      // Resume ONCE task: recalculate remaining delay from now to scheduled runAt
      const runAt = new Date(existing.runAt);
      const opts: JobsOptions = {
        delay: Math.max(0, runAt.getTime() - Date.now()),
        jobId: existing.jobId ?? existing.id,
        ...DEFAULT_JOB_OPTIONS,
      };
      const job = await this.queue.add(
        existing.handler,
        {
          ...(existing.payload as Record<string, unknown>),
          _taskId: existing.id,
        },
        opts,
      );
      newJobId = String(job.id ?? opts.jobId);
    }

    // Update database status to SCHEDULED and save new jobId
    await this.tasksRepository.update(id, {
      status: TaskStatus.SCHEDULED,
      jobId: newJobId,
      ...(existing.type === TaskType.CRON ? { repeatKey: null } : {}),
    });
    return { ok: true };
  }

  /**
   * Triggers immediate execution of a task.
   *
   * @description
   * Dispatches an immediate job instance directly to the queue without waiting for the scheduled time,
   * regardless of whether the task was originally one-time or recurring.
   *
   * @param id Task ID
   * @returns Object containing the newly triggered BullMQ Job ID
   */
  async runNow(id: string): Promise<{ jobId: string | number | null }> {
    const existing = await this.detail(id);
    const job = await this.queue.add(
      existing.handler,
      {
        ...(existing.payload as Record<string, unknown>),
        _taskId: existing.id,
      },
      {
        ...DEFAULT_JOB_OPTIONS,
      } as JobsOptions,
    );

    const jobIdVal = job.id ?? null;

    return { jobId: jobIdVal };
  }
}
