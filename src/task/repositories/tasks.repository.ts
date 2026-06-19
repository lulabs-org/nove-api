import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScheduledTask, TaskStatus, TaskType, Prisma, TaskExecutionLog } from '@prisma/client';

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ScheduledTaskCreateInput): Promise<ScheduledTask> {
    return this.prisma.scheduledTask.create({ data });
  }

  async findManyAndCount(args: Prisma.ScheduledTaskFindManyArgs): Promise<[ScheduledTask[], number]> {
    return this.prisma.$transaction([
      this.prisma.scheduledTask.findMany(args),
      this.prisma.scheduledTask.count({ where: args.where }),
    ]);
  }

  async findById(id: string): Promise<ScheduledTask | null> {
    return this.prisma.scheduledTask.findUnique({ where: { id } });
  }

  async findByIdOrThrow(id: string): Promise<ScheduledTask> {
    const task = await this.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(id: string, data: Prisma.ScheduledTaskUpdateInput): Promise<ScheduledTask> {
    return this.prisma.scheduledTask.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<ScheduledTask> {
    return this.prisma.scheduledTask.delete({ where: { id } });
  }

  async updateMany(where: Prisma.ScheduledTaskWhereInput, data: Prisma.ScheduledTaskUpdateManyMutationInput) {
    return this.prisma.scheduledTask.updateMany({
      where,
      data,
    });
  }

  async findByJobIdOrRepeatKey(jobId: string, repeatJobKey?: string): Promise<ScheduledTask | null> {
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
    lastError?: string | null
  ): Promise<ScheduledTask> {
    return this.prisma.scheduledTask.update({
      where: { id: taskId },
      data: { status, lastError: lastError !== undefined ? lastError : undefined },
    });
  }

  async createExecutionLog(data: Prisma.TaskExecutionLogUncheckedCreateInput): Promise<TaskExecutionLog> {
    return this.prisma.taskExecutionLog.create({ data });
  }

  async updateExecutionLog(
    jobId: string, 
    data: Prisma.TaskExecutionLogUpdateInput
  ): Promise<TaskExecutionLog | null> {
    const logs = await this.prisma.taskExecutionLog.findMany({
      where: { jobId },
      orderBy: { startedAt: 'desc' },
      take: 1,
    });
    
    if (logs.length > 0) {
      return this.prisma.taskExecutionLog.update({
        where: { id: logs[0].id },
        data,
      });
    }
    return null;
  }
}
