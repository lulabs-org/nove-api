import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { ITaskHandler } from '@/task/handlers/task-handler.interface';
import { TaskHandlerRegistry } from '@/task/handlers/task-handler.registry';
import { TaskStatus } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { WechatShopOrderService } from './wechat-shop-order.service';
import { WechatShopAftersaleService } from './wechat-shop-aftersale.service';
import {
  WECHAT_SYNC_HANDLER,
  WECHAT_SYNC_TASK_ID,
} from './wechat-shop-sync-schedule.service';

@Injectable()
export class WechatShopSyncScheduleHandler
  implements ITaskHandler, OnModuleInit
{
  readonly name = WECHAT_SYNC_HANDLER;

  constructor(
    private readonly registry: TaskHandlerRegistry,
    private readonly prisma: PrismaService,
    private readonly orders: WechatShopOrderService,
    private readonly aftersales: WechatShopAftersaleService,
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async handle(job: Job) {
    const data = job.data as {
      _taskId?: string;
      kinds?: string[];
      lookbackHours?: number;
      notBefore?: string;
    };
    if (data._taskId !== WECHAT_SYNC_TASK_ID) return { skipped: true };
    const task = await this.prisma.scheduledTask.findFirst({
      where: { id: data._taskId, deletedAt: null },
    });
    if (
      !task ||
      task.handler !== WECHAT_SYNC_HANDLER ||
      task.status === TaskStatus.PAUSED
    )
      return { skipped: true };
    if ((task.payload as { notBefore?: string }).notBefore !== data.notBefore) {
      return { skipped: true };
    }
    if (
      job.timestamp + (job.opts.delay ?? 0) <
      new Date(data.notBefore ?? 0).getTime()
    ) {
      return { skipped: true };
    }

    const end = new Date();
    const lookbackHours = Math.min(Math.max(data.lookbackHours ?? 25, 1), 169);
    const start = new Date(end.getTime() - lookbackHours * 3600_000);
    const range = {
      update_time_range: {
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      },
    };
    const result: Record<string, unknown> = {};
    if (data.kinds?.includes('orders')) {
      result.orders = await this.orders.syncHistory(range);
    }
    if (data.kinds?.includes('aftersale')) {
      result.aftersale = await this.aftersales.syncHistory(range);
    }
    return result;
  }
}
