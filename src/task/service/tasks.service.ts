// src/tasks/tasks.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
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
    const opts: JobsOptions = {
      delay: Math.max(0, runAt.getTime() - Date.now()),
      jobId: dto.jobIdHint ?? undefined,
      ...DEFAULT_JOB_OPTIONS,
    };

    const job = await this.queue.add('once', dto.payload, opts);

    const jobIdVal = job.id ?? null; // 👈 兜底

    return this.tasksRepository.create({
      name: dto.name,
      type: TaskType.ONCE,
      queueName: this.queue.name,
      jobId: jobIdVal === null ? null : String(jobIdVal), // 👈 避免 'undefined'
      payload: dto.payload as unknown as object,
      status: TaskStatus.SCHEDULED,
      runAt,
    });
  }

  async createCron(dto: CreateCronDto): Promise<ScheduledTask> {
    const timezone = dto.timezone ?? 'Asia/Shanghai'; // 使用传入的时区或默认值

    const repeat: RepeatOptions = {
      pattern: dto.cron,
      tz: timezone, // 使用动态时区
    };

    // 🔹 修改：把原始任务名放到 job.data 里，而不是改 job.name
    const job = await this.queue.add(
      'cron',
      {
        originalName: dto.name, // 🔹 保存任务标识，用于 Processor 匹配
        ...dto.payload, // 🔹 保留原 payload
      },
      {
        repeat,
        ...DEFAULT_JOB_OPTIONS,
      } as JobsOptions,
    );

    const jobIdVal = job.id ?? null; // 👈 兜底

    const repeatKey =
      job.opts.repeat?.key ??
      (job as { repeatJobKey?: string }).repeatJobKey ??
      null;

    return this.tasksRepository.create({
      name: dto.name,
      type: TaskType.CRON,
      queueName: this.queue.name,
      jobId: jobIdVal === null ? null : String(jobIdVal), // 👈
      repeatKey,
      payload: dto.payload as unknown as object,
      status: TaskStatus.SCHEDULED,
      cron: dto.cron,
      timezone, // 保存时区到数据库
    });
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

    if (
      existing.type === TaskType.CRON &&
      dto.cron &&
      dto.cron !== existing.cron
    ) {
      const timezone = dto.timezone ?? existing.timezone ?? 'Asia/Shanghai'; // 优先使用新时区

      if (existing.jobId) {
        await this.queue.removeJobScheduler(existing.jobId);
      } else if (existing.repeatKey) {
        await this.queue.removeRepeatableByKey(existing.repeatKey);
      }
      const job = await this.queue.add(
        'cron',
        dto.payload ?? (existing.payload as Record<string, unknown>),
        {
          repeat: { pattern: dto.cron, tz: timezone }, // 使用动态时区
          ...DEFAULT_JOB_OPTIONS,
        } as JobsOptions,
      );

      const repeatKey =
        job.opts.repeat?.key ?? (job as { repeatJobKey?: string }).repeatJobKey;

      return this.tasksRepository.update(id, {
        name: dto.name ?? existing.name,
        cron: dto.cron,
        timezone, // 更新时区
        repeatKey: repeatKey ?? null,
        payload: (dto.payload ?? existing.payload) as unknown as object,
        status: dto.status ?? existing.status,
      });
    }

    return this.tasksRepository.update(id, {
      name: dto.name ?? existing.name,
      timezone: dto.timezone ?? existing.timezone, // 更新时区
      payload: (dto.payload ?? existing.payload) as unknown as object,
      status: dto.status ?? existing.status,
    });
  }

  async remove(id: string): Promise<{ ok: true }> {
    const existing = await this.detail(id);

    if (existing.type === TaskType.CRON) {
      if (existing.jobId) {
        await this.queue.removeJobScheduler(existing.jobId);
      } else if (existing.repeatKey) {
        await this.queue.removeRepeatableByKey(existing.repeatKey);
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

  async runNow(id: string): Promise<{ jobId: string | number | null }> {
    const existing = await this.detail(id);
    const job = await this.queue.add(
      'manual',
      existing.payload as Record<string, unknown>,
      {
        ...DEFAULT_JOB_OPTIONS,
      } as JobsOptions,
    );

    const jobIdVal = job.id ?? null; // 👈

    return { jobId: jobIdVal };
  }
}
