import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScheduledTask, TaskStatus, Prisma } from '@prisma/client';

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ScheduledTaskCreateInput): Promise<ScheduledTask> {
    return this.prisma.scheduledTask.create({ data });
  }

  async findManyAndCount(
    args: Prisma.ScheduledTaskFindManyArgs,
  ): Promise<[ScheduledTask[], number]> {
    // Inject deletedAt filter
    const where = { ...args.where, deletedAt: null };
    return this.prisma.$transaction([
      this.prisma.scheduledTask.findMany({ ...args, where }),
      this.prisma.scheduledTask.count({ where }),
    ]);
  }

  async findById(id: string): Promise<ScheduledTask | null> {
    return this.prisma.scheduledTask.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByIdOrThrow(id: string): Promise<ScheduledTask> {
    const task = await this.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(
    id: string,
    data: Prisma.ScheduledTaskUpdateInput,
  ): Promise<ScheduledTask> {
    return this.prisma.scheduledTask.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<ScheduledTask> {
    return this.prisma.scheduledTask.delete({ where: { id } });
  }

  async softDelete(id: string): Promise<ScheduledTask> {
    return this.prisma.scheduledTask.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async updateMany(
    where: Prisma.ScheduledTaskWhereInput,
    data: Prisma.ScheduledTaskUpdateManyMutationInput,
  ) {
    return this.prisma.scheduledTask.updateMany({
      where,
      data,
    });
  }

  async findByJobIdOrRepeatKey(
    jobId: string,
    repeatJobKey?: string,
  ): Promise<ScheduledTask | null> {
    const whereClause: Prisma.ScheduledTaskWhereInput[] = [{ jobId }];
    if (repeatJobKey) {
      whereClause.push({ repeatKey: repeatJobKey });
    }

    const tasks = await this.prisma.scheduledTask.findMany({
      where: { OR: whereClause },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    return tasks[0] || null;
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    lastError?: string | null,
  ): Promise<ScheduledTask> {
    return this.prisma.scheduledTask.update({
      where: { id: taskId },
      data: {
        status,
        lastError: lastError !== undefined ? lastError : undefined,
      },
    });
  }
}
