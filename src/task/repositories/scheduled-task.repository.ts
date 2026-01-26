import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScheduledTask, TaskStatus, TaskType } from '@prisma/client';

@Injectable()
export class ScheduledTaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    type: TaskType;
    queueName: string;
    jobId: string | null;
    payload: object;
    status: TaskStatus;
    runAt?: Date;
    cron?: string;
    repeatKey?: string | null;
  }): Promise<ScheduledTask> {
    return this.prisma.scheduledTask.create({ data });
  }

  async list(params: {
    page: number;
    pageSize: number;
    search?: string;
    status?: TaskStatus;
    type?: TaskType;
    orderBy?: string;
    orderDir?: 'asc' | 'desc';
  }) {
    const { page, pageSize, search, status, type, orderBy, orderDir } = params;

    const where = {
      AND: [
        search
          ? { name: { contains: search, mode: 'insensitive' as const } }
          : {},
        status ? { status } : {},
        type ? { type } : {},
      ],
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.scheduledTask.findMany({
        where,
        orderBy: { [orderBy ?? 'createdAt']: orderDir ?? 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.scheduledTask.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async detail(id: string): Promise<ScheduledTask> {
    const task = await this.prisma.scheduledTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(
    id: string,
    data: {
      name?: string;
      cron?: string;
      repeatKey?: string | null;
      payload?: object;
      status?: TaskStatus;
    },
  ): Promise<ScheduledTask> {
    return this.prisma.scheduledTask.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<ScheduledTask> {
    return this.prisma.scheduledTask.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async updateMany(
    where: {
      queueName: string;
      status?: TaskStatus;
      statusIn?: TaskStatus[];
    },
    data: {
      status: TaskStatus;
    },
  ): Promise<{ count: number }> {
    const result = await this.prisma.scheduledTask.updateMany({
      where: {
        queueName: where.queueName,
        ...(where.status ? { status: where.status } : {}),
        ...(where.statusIn ? { status: { in: where.statusIn } } : {}),
      },
      data,
    });
    return { count: result.count };
  }

  async updateStatusToRunning(jobId: string): Promise<{ count: number }> {
    const result = await this.prisma.scheduledTask.updateMany({
      where: { jobId },
      data: { status: TaskStatus.RUNNING },
    });
    return { count: result.count };
  }

  async updateStatusToCompleted(jobId: string): Promise<{ count: number }> {
    const result = await this.prisma.scheduledTask.updateMany({
      where: { jobId },
      data: { status: TaskStatus.COMPLETED, lastError: null },
    });
    return { count: result.count };
  }

  async updateStatusToFailed(
    jobId: string,
    errorMessage: string,
  ): Promise<{ count: number }> {
    const result = await this.prisma.scheduledTask.updateMany({
      where: { jobId },
      data: { status: TaskStatus.FAILED, lastError: errorMessage },
    });
    return { count: result.count };
  }
}
