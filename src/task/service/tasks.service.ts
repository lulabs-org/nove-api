// src/tasks/tasks.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue, JobsOptions, RepeatOptions } from 'bullmq';
import { CreateOnceDto } from '../dtos/create-once.dto';
import { CreateCronDto } from '../dtos/create-cron.dto';
import { UpdateTaskDto } from '../dtos/update-task.dto';
import { QueryDto } from '../dtos/query.dto';
import { ScheduledTask, TaskStatus, TaskType } from '@prisma/client';
import { TasksRepository } from '../repositories/tasks.repository';
import { TASK_QUEUE_NAME, DEFAULT_JOB_OPTIONS } from '../task.constants';

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    @InjectQueue(TASK_QUEUE_NAME) private readonly queue: Queue,
  ) {}

  // v5: 不需要 QueueScheduler，删除 onModuleInit

  async createOnce(dto: CreateOnceDto): Promise<ScheduledTask> {
    const runAt = new Date(dto.runAt);

    // Create DB record first to generate the ID
    const task = await this.tasksRepository.create({
      name: dto.name,
      handler: dto.handler,
      type: TaskType.ONCE,
      queueName: this.queue.name,
      payload: dto.payload as unknown as object,
      status: TaskStatus.SCHEDULED,
      runAt,
    });

    const opts: JobsOptions = {
      delay: Math.max(0, runAt.getTime() - Date.now()),
      jobId: dto.jobIdHint ?? task.id,
      ...DEFAULT_JOB_OPTIONS,
    };

    try {
      const job = await this.queue.add(
        dto.handler,
        { ...dto.payload, _taskId: task.id },
        opts,
      );
      return await this.tasksRepository.update(task.id, {
        jobId: String(job.id ?? opts.jobId),
      });
    } catch (err) {
      await this.tasksRepository.delete(task.id);
      throw err;
    }
  }

  async createCron(dto: CreateCronDto): Promise<ScheduledTask> {
    const timezone = dto.timezone ?? 'Asia/Shanghai'; // 使用传入的时区或默认值

    const task = await this.tasksRepository.create({
      name: dto.name,
      handler: dto.handler,
      type: TaskType.CRON,
      queueName: this.queue.name,
      payload: dto.payload as unknown as object,
      status: TaskStatus.SCHEDULED,
      cron: dto.cron,
      timezone, // 保存时区到数据库
    });

    try {
      const repeat: RepeatOptions = {
        pattern: dto.cron,
        tz: timezone, // 使用动态时区
      };

      await this.queue.add(dto.handler, { ...dto.payload, _taskId: task.id }, {
        repeat,
        jobId: task.id, // Explicit jobId so BullMQ v5 doesn't overwrite schedulers
        ...DEFAULT_JOB_OPTIONS,
      } as JobsOptions);

      return await this.tasksRepository.update(task.id, {
        jobId: task.id, // The scheduler ID is the task id
        repeatKey: null,
      });
    } catch (err) {
      await this.tasksRepository.delete(task.id);
      throw err;
    }
  }

  async list(q: QueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;

    const where = {
      AND: [
        q.search
          ? { name: { contains: q.search, mode: 'insensitive' as const } }
          : {},
        q.status ? { status: q.status as TaskStatus } : {},
        q.type ? { type: q.type as TaskType } : {},
      ],
    };

    const [items, total] = await this.tasksRepository.findManyAndCount({
      where,
      orderBy: { [q.orderBy ?? 'createdAt']: q.orderDir ?? 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  async detail(id: string): Promise<ScheduledTask> {
    return this.tasksRepository.findByIdOrThrow(id);
  }

  async update(id: string, dto: UpdateTaskDto): Promise<ScheduledTask> {
    const existing = await this.detail(id);
    const newHandler = dto.handler ?? existing.handler;

    if (
      existing.type === TaskType.CRON &&
      dto.cron &&
      dto.cron !== existing.cron
    ) {
      const timezone = dto.timezone ?? existing.timezone ?? 'Asia/Shanghai'; // 优先使用新时区

      if (existing.jobId) {
        await this.queue
          .removeJobScheduler(existing.jobId)
          .catch(() => undefined);
      }
      if (existing.repeatKey) {
        await this.queue
          .removeRepeatableByKey(existing.repeatKey)
          .catch(() => undefined);
      }

      await this.queue.add(
        newHandler,
        {
          ...(dto.payload ?? (existing.payload as Record<string, unknown>)),
          _taskId: existing.id,
        },
        {
          repeat: { pattern: dto.cron, tz: timezone }, // 使用动态时区
          jobId: existing.id,
          ...DEFAULT_JOB_OPTIONS,
        } as JobsOptions,
      );

      return this.tasksRepository.update(id, {
        name: dto.name ?? existing.name,
        handler: newHandler,
        cron: dto.cron,
        timezone, // 更新时区
        repeatKey: null,
        jobId: existing.id,
        payload: (dto.payload ?? existing.payload) as unknown as object,
        status: dto.status ?? existing.status,
      });
    }

    return this.tasksRepository.update(id, {
      name: dto.name ?? existing.name,
      handler: newHandler,
      timezone: dto.timezone ?? existing.timezone, // 更新时区
      payload: (dto.payload ?? existing.payload) as unknown as object,
      status: dto.status ?? existing.status,
    });
  }

  async remove(id: string): Promise<{ ok: true }> {
    const existing = await this.detail(id);

    if (existing.type === TaskType.CRON) {
      if (existing.jobId) {
        await this.queue
          .removeJobScheduler(existing.jobId)
          .catch(() => undefined);
      }
      if (existing.repeatKey) {
        await this.queue
          .removeRepeatableByKey(existing.repeatKey)
          .catch(() => undefined);
      }
    } else if (existing.jobId) {
      await this.queue.remove(existing.jobId).catch(() => undefined);
    }

    await this.tasksRepository.delete(id);
    return { ok: true };
  }

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

  async resumeQueue(): Promise<{ ok: true }> {
    await this.queue.resume();
    await this.tasksRepository.updateMany(
      { queueName: this.queue.name, status: TaskStatus.PAUSED },
      { status: TaskStatus.SCHEDULED },
    );
    return { ok: true };
  }

  async pauseTask(id: string): Promise<{ ok: true }> {
    const existing = await this.detail(id);
    if (existing.status === TaskStatus.PAUSED) {
      return { ok: true };
    }

    if (existing.type === TaskType.CRON) {
      if (existing.jobId) {
        await this.queue
          .removeJobScheduler(existing.jobId)
          .catch(() => undefined);
      }
      if (existing.repeatKey) {
        await this.queue
          .removeRepeatableByKey(existing.repeatKey)
          .catch(() => undefined);
      }
    } else if (existing.jobId) {
      await this.queue.remove(existing.jobId).catch(() => undefined);
    }

    await this.tasksRepository.update(id, { status: TaskStatus.PAUSED });
    return { ok: true };
  }

  async resumeTask(id: string): Promise<{ ok: true }> {
    const existing = await this.detail(id);
    if (existing.status !== TaskStatus.PAUSED) {
      return { ok: true };
    }

    let newJobId = existing.jobId;

    if (existing.type === TaskType.CRON && existing.cron) {
      const timezone = existing.timezone ?? 'Asia/Shanghai';
      await this.queue.add(
        existing.handler,
        {
          ...(existing.payload as Record<string, unknown>),
          _taskId: existing.id,
        },
        {
          repeat: { pattern: existing.cron, tz: timezone },
          jobId: existing.id,
          ...DEFAULT_JOB_OPTIONS,
        } as JobsOptions,
      );
      newJobId = existing.id;
    } else if (existing.type === TaskType.ONCE && existing.runAt) {
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

    await this.tasksRepository.update(id, {
      status: TaskStatus.SCHEDULED,
      jobId: newJobId,
      ...(existing.type === TaskType.CRON ? { repeatKey: null } : {}),
    });
    return { ok: true };
  }

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

    const jobIdVal = job.id ?? null; // 👈

    return { jobId: jobIdVal };
  }
}
