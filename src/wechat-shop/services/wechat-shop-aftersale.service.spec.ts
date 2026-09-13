import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException } from '@nestjs/common';
import { WechatShopAftersaleService } from './wechat-shop-aftersale.service';
import { WechatShopClientService } from './wechat-shop-client.service';
import { WechatShopRepository } from '../repositories';
import { WechatAftersaleHistorySyncDto } from '../dto';

describe('WechatShopAftersaleService', () => {
  let service: WechatShopAftersaleService;
  const getAftersaleList = jest.fn();
  const getAftersaleOrder = jest.fn();
  const findLatestByExternalId = jest.fn();
  const upsertRefund = jest.fn();
  interface EnqueuedJob {
    name: string;
    data: {
      range: { startTime: number; endTime: number };
      timeRangeKey: string;
    };
  }

  const queueAddBulk = jest.fn<Promise<unknown[]>, [EnqueuedJob[]]>();

  beforeEach(async () => {
    jest.clearAllMocks();

    const clientService = {
      getAftersaleList,
      getAftersaleOrder,
    } as unknown as WechatShopClientService;

    const repository = {
      findLatestByExternalId,
      upsertRefund,
    } as unknown as WechatShopRepository;

    const queue = {
      addBulk: queueAddBulk.mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WechatShopAftersaleService,
        { provide: WechatShopClientService, useValue: clientService },
        { provide: WechatShopRepository, useValue: repository },
        { provide: getQueueToken('wechat-order-sync'), useValue: queue },
      ],
    }).compile();

    service = module.get<WechatShopAftersaleService>(
      WechatShopAftersaleService,
    );
  });

  describe('syncHistory', () => {
    it('slices time into 24-hour ranges and enqueues bulk jobs for create_time_range', async () => {
      const payload: WechatAftersaleHistorySyncDto = {
        create_time_range: {
          start_time: '2026-01-01T00:00:00.000Z',
          end_time: '2026-01-03T00:00:00.000Z',
        },
      };

      const result = await service.syncHistory(payload);

      expect(result.enqueuedRangeTasks).toBe(2);
      expect(queueAddBulk).toHaveBeenCalledTimes(1);
      const [jobs] = queueAddBulk.mock.calls[0];
      expect(jobs[0].name).toBe('sync-aftersale-history-range');
      expect(jobs[0].data.timeRangeKey).toBe('create_time_range');
      expect(jobs[0].data.range.endTime - jobs[0].data.range.startTime).toBe(
        86400,
      );
    });

    it('enqueues bulk jobs for update_time_range', async () => {
      const payload: WechatAftersaleHistorySyncDto = {
        update_time_range: {
          start_time: '2026-01-01T00:00:00.000Z',
          end_time: '2026-01-01T12:00:00.000Z',
        },
      };

      const result = await service.syncHistory(payload);

      expect(result.enqueuedRangeTasks).toBe(1);
      const [jobs] = queueAddBulk.mock.calls[0];
      expect(jobs[0].data.timeRangeKey).toBe('update_time_range');
    });

    it('throws BadRequestException when neither range is passed', async () => {
      await expect(
        service.syncHistory({} as WechatAftersaleHistorySyncDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when startTime >= endTime', async () => {
      await expect(
        service.syncHistory({
          create_time_range: {
            start_time: '2026-01-02T00:00:00.000Z',
            end_time: '2026-01-01T00:00:00.000Z',
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when range exceeds 1 year', async () => {
      await expect(
        service.syncHistory({
          create_time_range: {
            start_time: '2024-01-01T00:00:00.000Z',
            end_time: '2026-01-01T00:00:00.000Z',
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('processHistoryRange', () => {
    it('paginates and dispatches sync-single-aftersale jobs', async () => {
      getAftersaleList
        .mockResolvedValueOnce({
          errcode: 0,
          errmsg: 'ok',
          after_sale_order_id_list: ['aftersale-1', 'aftersale-2'],
          has_more: true,
          next_key: 'page_2_key',
        })
        .mockResolvedValueOnce({
          errcode: 0,
          errmsg: 'ok',
          after_sale_order_id_list: ['aftersale-3'],
          has_more: false,
        });

      const result = await service.processHistoryRange({
        range: { startTime: 1700000000, endTime: 1700086400 },
        timeRangeKey: 'create_time_range',
      });

      expect(result.enqueued).toBe(3);
      expect(getAftersaleList).toHaveBeenCalledTimes(2);
      expect(queueAddBulk).toHaveBeenCalledTimes(2);
      expect(queueAddBulk).toHaveBeenNthCalledWith(1, [
        {
          name: 'sync-single-aftersale',
          data: { afterSaleOrderId: 'aftersale-1' },
        },
        {
          name: 'sync-single-aftersale',
          data: { afterSaleOrderId: 'aftersale-2' },
        },
      ]);
      expect(queueAddBulk).toHaveBeenNthCalledWith(2, [
        {
          name: 'sync-single-aftersale',
          data: { afterSaleOrderId: 'aftersale-3' },
        },
      ]);
    });
  });

  describe('getAftersaleList', () => {
    it('supports direct timestamp querying within 24 hours', async () => {
      const mockResult = {
        errcode: 0,
        errmsg: 'ok',
        after_sale_order_id_list: ['aftersale-100'],
        has_more: false,
      };
      getAftersaleList.mockResolvedValue(mockResult);

      const res = await service.getAftersaleList({
        begin_create_time: 1700000000,
        end_create_time: 1700050000,
      });

      expect(res).toEqual(mockResult);
      expect(getAftersaleList).toHaveBeenCalledWith({
        begin_create_time: 1700000000,
        end_create_time: 1700050000,
        next_key: undefined,
      });
    });

    it('supports ISO date range querying', async () => {
      const mockResult = {
        errcode: 0,
        errmsg: 'ok',
        after_sale_order_id_list: ['aftersale-200'],
        has_more: false,
      };
      getAftersaleList.mockResolvedValue(mockResult);

      const res = await service.getAftersaleList({
        create_time_range: {
          start_time: '2026-01-01T00:00:00.000Z',
          end_time: '2026-01-01T12:00:00.000Z',
        },
      });

      expect(res).toEqual(mockResult);
      expect(getAftersaleList).toHaveBeenCalledWith(
        expect.objectContaining({
          begin_create_time: Math.floor(
            new Date('2026-01-01T00:00:00.000Z').getTime() / 1000,
          ),
          end_create_time: Math.floor(
            new Date('2026-01-01T12:00:00.000Z').getTime() / 1000,
          ),
        }),
      );
    });

    it('throws BadRequestException when query range exceeds 24 hours', async () => {
      await expect(
        service.getAftersaleList({
          begin_create_time: 1700000000,
          end_create_time: 1700000000 + 86401,
        }),
      ).rejects.toThrow('Time range cannot exceed 24 hours');
    });

    it('throws BadRequestException when startTime >= endTime', async () => {
      await expect(
        service.getAftersaleList({
          begin_create_time: 1700050000,
          end_create_time: 1700000000,
        }),
      ).rejects.toThrow('startTime must be earlier than endTime');
    });

    it('throws BadRequestException when neither range is provided', async () => {
      await expect(service.getAftersaleList({})).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
