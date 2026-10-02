import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TasksService } from '@/task/services/tasks.service';
import {
  WechatShopSyncScheduleDto,
  WechatSyncPeriod,
} from '../dto/wechat-shop-sync-schedule.dto';

export const WECHAT_SYNC_HANDLER = 'wechat_shop_scheduled_sync';
export const WECHAT_SYNC_TASK_ID = 'wechat-shop-scheduled-sync';

@Injectable()
export class WechatShopSyncScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasks: TasksService,
  ) {}

  private findTask() {
    return this.prisma.scheduledTask.findUnique({
      where: { id: WECHAT_SYNC_TASK_ID },
    });
  }

  async get() {
    const task = await this.findTask();
    if (!task || task.deletedAt) return null;
    return {
      ...(task.payload as Record<string, unknown>),
      id: task.id,
      status: task.status,
      timezone: task.timezone,
    };
  }

  async save(dto: WechatShopSyncScheduleDto) {
    if (dto.period === WechatSyncPeriod.HOURLY && !dto.intervalHours) {
      throw new BadRequestException('按小时同步时请选择间隔');
    }
    if (dto.period !== WechatSyncPeriod.HOURLY && !dto.time) {
      throw new BadRequestException('按日或周同步时请选择执行时间');
    }
    if (dto.period === WechatSyncPeriod.WEEKLY && dto.weekday === undefined) {
      throw new BadRequestException('按周同步时请选择星期');
    }

    const [hour, minute] = (dto.time ?? '00:00').split(':').map(Number);
    const cron =
      dto.period === WechatSyncPeriod.HOURLY
        ? `0 0 */${dto.intervalHours} * * *`
        : dto.period === WechatSyncPeriod.DAILY
          ? `0 ${minute} ${hour} * * *`
          : `0 ${minute} ${hour} * * ${dto.weekday}`;
    const lookbackHours =
      dto.period === WechatSyncPeriod.HOURLY
        ? dto.intervalHours! + 1
        : dto.period === WechatSyncPeriod.DAILY
          ? 25
          : 169;
    const payload = {
      kinds: [...new Set(dto.kinds)],
      period: dto.period,
      intervalHours:
        dto.period === WechatSyncPeriod.HOURLY ? dto.intervalHours : null,
      time: dto.period === WechatSyncPeriod.HOURLY ? null : dto.time,
      weekday: dto.period === WechatSyncPeriod.WEEKLY ? dto.weekday : null,
      lookbackHours,
      // BullMQ creates a job immediately when adding a scheduler. Skip that setup job.
      notBefore: new Date(Date.now() + 1_000).toISOString(),
    };
    const existing = await this.findTask();
    if (existing) {
      if (existing.deletedAt) {
        await this.prisma.scheduledTask.update({
          where: { id: WECHAT_SYNC_TASK_ID },
          data: { deletedAt: null },
        });
      }
      await this.tasks.update(existing.id, {
        name: '微信小店定时同步',
        cron,
        timezone: 'Asia/Shanghai',
        payload,
      });
      if (existing.status === 'PAUSED')
        await this.tasks.resumeTask(existing.id);
    } else {
      await this.tasks.createCron(
        {
          name: '微信小店定时同步',
          handler: WECHAT_SYNC_HANDLER,
          cron,
          timezone: 'Asia/Shanghai',
          payload,
        },
        WECHAT_SYNC_TASK_ID,
      );
    }
    return this.get();
  }

  async remove() {
    const existing = await this.findTask();
    if (existing && !existing.deletedAt && existing.status !== 'PAUSED') {
      await this.tasks.pauseTask(existing.id);
    }
    return { ok: true };
  }
}
