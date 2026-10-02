import { Job } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { TaskHandlerRegistry } from '@/task/handlers/task-handler.registry';
import { WechatShopOrderService } from './wechat-shop-order.service';
import { WechatShopAftersaleService } from './wechat-shop-aftersale.service';
import { WechatOrderHistorySyncDto } from '../dto/wechat-order-history-sync.dto';
import { WechatShopSyncScheduleHandler } from './wechat-shop-sync-schedule.handler';
import { WECHAT_SYNC_TASK_ID } from './wechat-shop-sync-schedule.service';

describe('WechatShopSyncScheduleHandler', () => {
  const findFirst = jest.fn();
  const ordersSync = jest
    .fn<Promise<{ enqueuedRangeTasks: number }>, [WechatOrderHistorySyncDto]>()
    .mockResolvedValue({ enqueuedRangeTasks: 1 });
  const aftersalesSync = jest.fn();
  const handler = new WechatShopSyncScheduleHandler(
    { register: jest.fn() } as unknown as TaskHandlerRegistry,
    { scheduledTask: { findFirst } } as unknown as PrismaService,
    { syncHistory: ordersSync } as unknown as WechatShopOrderService,
    { syncHistory: aftersalesSync } as unknown as WechatShopAftersaleService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findFirst.mockResolvedValue({
      handler: handler.name,
      status: 'RUNNING',
      payload: { notBefore: '2026-01-01T00:00:00.000Z' },
    });
  });

  it('queues only selected data for a bounded update-time window', async () => {
    await handler.handle({
      timestamp: Date.now(),
      opts: { delay: 0 },
      data: {
        _taskId: WECHAT_SYNC_TASK_ID,
        kinds: ['orders'],
        lookbackHours: 7,
        notBefore: '2026-01-01T00:00:00.000Z',
      },
    } as Job);
    const payload = ordersSync.mock.calls[0]?.[0] as {
      update_time_range: { start_time: string; end_time: string };
    };
    expect(payload.update_time_range.start_time).toMatch(/Z$/);
    expect(payload.update_time_range.end_time).toMatch(/Z$/);
    expect(aftersalesSync).not.toHaveBeenCalled();
  });

  it('skips a stale setup job after a schedule change', async () => {
    await expect(
      handler.handle({
        timestamp: Date.now(),
        opts: { delay: 0 },
        data: {
          _taskId: WECHAT_SYNC_TASK_ID,
          kinds: ['orders'],
          lookbackHours: 7,
          notBefore: '2026-01-02T00:00:00.000Z',
        },
      } as Job),
    ).resolves.toEqual({ skipped: true });
    expect(ordersSync).not.toHaveBeenCalled();
  });
});
