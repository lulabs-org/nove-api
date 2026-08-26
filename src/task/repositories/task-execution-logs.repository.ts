import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TaskExecutionLog } from '@prisma/client';

@Injectable()
export class TaskExecutionLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createExecutionLog(
    data: Prisma.TaskExecutionLogUncheckedCreateInput,
  ): Promise<TaskExecutionLog> {
    return this.prisma.taskExecutionLog.create({ data });
  }

  async updateExecutionLog(
    jobId: string,
    data: Prisma.TaskExecutionLogUpdateInput,
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
