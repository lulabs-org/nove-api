import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScheduledTask, TaskStatus, TaskType, Prisma } from '@prisma/client';

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
}
