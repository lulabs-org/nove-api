import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TasksService } from '@/task/services/tasks.service';
import { CreateCronDto } from '@/task/dto/create-cron.dto';
import { UpdateTaskDto } from '@/task/dto/update-task.dto';
import {
  WechatSyncKind,
  WechatSyncPeriod,
} from '../dto/wechat-shop-sync-schedule.dto';
import {
  WECHAT_SYNC_TASK_ID,
  WechatShopSyncScheduleService,
} from './wechat-shop-sync-schedule.service';

describe('WechatShopSyncScheduleService', () => {
  const findUnique = jest.fn();
  const createCron = jest.fn<Promise<void>, [CreateCronDto, string?]>();
  const update = jest.fn<Promise<void>, [string, UpdateTaskDto]>();
  const pauseTask = jest.fn();
  const resumeTask = jest.fn();
  const service = new WechatShopSyncScheduleService(
    { scheduledTask: { findUnique } } as unknown as PrismaService,
    { createCron, update, pauseTask, resumeTask } as unknown as TasksService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findUnique.mockResolvedValue(null);
  });

  it('requires a weekday for weekly sync', async () => {
    await expect(
      service.save({
        kinds: [WechatSyncKind.ORDERS],
        period: WechatSyncPeriod.WEEKLY,
        time: '02:00',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createCron).not.toHaveBeenCalled();
  });

  it('creates a weekly schedule for selected data in Shanghai time', async () => {
    await service.save({
      kinds: [WechatSyncKind.AFTERSALE],
      period: WechatSyncPeriod.WEEKLY,
      weekday: 1,
      time: '09:30',
    });
    const created = createCron.mock.calls[0]?.[0];
    expect(created?.cron).toBe('0 30 9 * * 1');
    expect(created?.timezone).toBe('Asia/Shanghai');
    expect(created?.payload).toMatchObject({
      kinds: ['aftersale'],
      lookbackHours: 169,
    });
    expect(createCron.mock.calls[0]?.[1]).toBe(WECHAT_SYNC_TASK_ID);
  });

  it('updates and resumes an existing paused schedule', async () => {
    findUnique.mockResolvedValue({ id: WECHAT_SYNC_TASK_ID, status: 'PAUSED' });
    await service.save({
      kinds: [WechatSyncKind.ORDERS],
      period: WechatSyncPeriod.HOURLY,
      intervalHours: 6,
    });
    const updated = update.mock.calls[0]?.[1];
    expect(update.mock.calls[0]?.[0]).toBe(WECHAT_SYNC_TASK_ID);
    expect(updated?.cron).toBe('0 0 */6 * * *');
    expect(updated?.payload).toMatchObject({ lookbackHours: 7 });
    expect(resumeTask).toHaveBeenCalledWith(WECHAT_SYNC_TASK_ID);
    expect(createCron).not.toHaveBeenCalled();
  });

  it('pauses the current schedule', async () => {
    findUnique.mockResolvedValue({
      id: WECHAT_SYNC_TASK_ID,
      status: 'SCHEDULED',
    });
    await expect(service.remove()).resolves.toEqual({ ok: true });
    expect(pauseTask).toHaveBeenCalledWith(WECHAT_SYNC_TASK_ID);
  });
});
