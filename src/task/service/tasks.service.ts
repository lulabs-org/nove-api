import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue, JobsOptions, RepeatOptions } from 'bullmq';
import { CreateCronDto, CreateOnceDto, QueryDto, UpdateTaskDto } from '../dtos';
import { ScheduledTaskRepository } from '../repositories/scheduled-task.repository';
import { ScheduledTask, TaskStatus, TaskType } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(
    private readonly taskRepo: ScheduledTaskRepository,
    @InjectQueue('tasks') private readonly queue: Queue,
  ) {}

  // v5: 不需要 QueueScheduler，删除 onModuleInit

  async createOnce(dto: CreateOnceDto): Promise<ScheduledTask> {
    const runAt = new Date(dto.runAt);
    const opts: JobsOptions = {
      delay: Math.max(0, runAt.getTime() - Date.now()),
      jobId: dto.jobIdHint ?? undefined,
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 24 * 3600, count: 1000 },
    };

    const job = await this.queue.add('once', dto.payload, opts);

    const jobIdVal = job.id ?? null;

    return this.taskRepo.create({
      name: dto.name,
      type: TaskType.ONCE,
      queueName: this.queue.name,
      jobId: jobIdVal === null ? null : String(jobIdVal),
      payload: dto.payload as unknown as object,
      status: TaskStatus.SCHEDULED,
      runAt,
    });
  }

  async createCron(dto: CreateCronDto): Promise<ScheduledTask> {
    const repeat: RepeatOptions = {
      pattern: dto.cron,
      tz: 'Asia/Shanghai', // 可改为配置项
    };

    // 🔹 修改：把原始任务名放到 job.data 里，而不是改 job.name
    const job = await this.queue.add('cron', dto.payload, {
      repeat,
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 24 * 3600, count: 1000 },
    } as JobsOptions);

    const jobIdVal = job.id ?? null;

    const repeatKey =
      job.opts.repeat?.key ??
      (job as { repeatJobKey?: string }).repeatJobKey ??
      null;

    return this.taskRepo.create({
      name: dto.name,
      type: TaskType.CRON,
      queueName: this.queue.name,
      jobId: jobIdVal === null ? null : String(jobIdVal),
      payload: dto.payload as unknown as object,
      status: TaskStatus.SCHEDULED,
      cron: dto.cron,
      repeatKey,
    });
  }

  async list(q: QueryDto) {
    return this.taskRepo.list({
      page: q.page ?? 1,
      pageSize: q.pageSize ?? 20,
      search: q.search,
      status: q.status as TaskStatus,
      type: q.type as TaskType,
      orderBy: q.orderBy,
      orderDir: q.orderDir,
    });
  }

  async detail(id: string): Promise<ScheduledTask> {
    return this.taskRepo.detail(id);
  }

  async update(id: string, dto: UpdateTaskDto): Promise<ScheduledTask> {
    const existing = await this.detail(id);

    if (
      existing.type === TaskType.CRON &&
      dto.cron &&
      dto.cron !== existing.cron
    ) {
      if (existing.repeatKey) {
        await this.queue.removeJobScheduler(existing.repeatKey);
      }
      const job = await this.queue.add(
        'cron',
        dto.payload ?? (existing.payload as Record<string, unknown>),
        {
          repeat: { cron: dto.cron, tz: 'Asia/Shanghai' },
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 24 * 3600, count: 1000 },
        } as JobsOptions,
      );

      const repeatKey =
        job.opts.repeat?.key ?? (job as { repeatJobKey?: string }).repeatJobKey;

      return this.taskRepo.update(id, {
        name: dto.name ?? existing.name,
        cron: dto.cron,
        repeatKey: repeatKey ?? null,
        payload: (dto.payload ?? existing.payload) as unknown as object,
        status: dto.status ?? existing.status,
      });
    }

    return this.taskRepo.update(id, {
      name: dto.name ?? existing.name,
      payload: (dto.payload ?? existing.payload) as unknown as object,
      status: dto.status ?? existing.status,
    });
  }

  async remove(id: string): Promise<{ ok: true }> {
    const existing = await this.detail(id);

    if (existing.type === TaskType.CRON) {
      if (existing.repeatKey) {
        await this.queue.removeJobScheduler(existing.repeatKey);
      }
    } else if (existing.jobId) {
      await this.queue.remove(existing.jobId).catch(() => undefined);
    }

    await this.taskRepo.delete(id);
    return { ok: true };
  }

  async pauseQueue(): Promise<{ ok: true }> {
    await this.queue.pause();
    await this.taskRepo.updateMany(
      {
        queueName: this.queue.name,
        statusIn: [TaskStatus.SCHEDULED],
      },
      { status: TaskStatus.PAUSED },
    );
    return { ok: true };
  }

  async resumeQueue(): Promise<{ ok: true }> {
    await this.queue.resume();
    await this.taskRepo.updateMany(
      {
        queueName: this.queue.name,
        status: TaskStatus.PAUSED,
      },
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
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 24 * 3600, count: 1000 },
      } as JobsOptions,
    );

    const jobIdVal = job.id ?? null; // 👈

    return { jobId: jobIdVal };
  }
}
