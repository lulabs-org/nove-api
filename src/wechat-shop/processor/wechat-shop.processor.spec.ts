import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { WechatShopProcessor } from './wechat-shop.processor';
import { WechatShopOrderService } from '../services/wechat-shop-order.service';
import { WechatShopAftersaleService } from '../services/wechat-shop-aftersale.service';

describe('WechatShopProcessor', () => {
  let processor: WechatShopProcessor;
  const syncSingleOrder = jest.fn();
  const processOrderHistoryRange = jest.fn();
  const syncSingleAftersale = jest.fn();
  const processAftersaleHistoryRange = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockOrderService = {
      syncSingle: syncSingleOrder,
      processHistoryRange: processOrderHistoryRange,
    } as unknown as WechatShopOrderService;

    const mockAftersaleService = {
      syncSingle: syncSingleAftersale,
      processHistoryRange: processAftersaleHistoryRange,
    } as unknown as WechatShopAftersaleService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WechatShopProcessor,
        { provide: WechatShopOrderService, useValue: mockOrderService },
        { provide: WechatShopAftersaleService, useValue: mockAftersaleService },
      ],
    }).compile();

    processor = module.get<WechatShopProcessor>(WechatShopProcessor);
  });

  it('processes sync-single-order job', async () => {
    const job = {
      name: 'sync-single-order',
      data: { orderId: '12345' },
    } as Job;

    await processor.process(job);

    expect(syncSingleOrder).toHaveBeenCalledWith('12345');
  });

  it('processes sync-single-aftersale job', async () => {
    const job = {
      name: 'sync-single-aftersale',
      data: { afterSaleOrderId: 'aftersale-123' },
    } as Job;

    await processor.process(job);

    expect(syncSingleAftersale).toHaveBeenCalledWith('aftersale-123');
  });

  it('processes sync-history-range job', async () => {
    const jobData = {
      range: { startTime: 1000, endTime: 2000 },
      pageSize: 100,
      timeRangeKey: 'create_time_range' as const,
    };
    const job = {
      name: 'sync-history-range',
      data: jobData,
    } as Job;

    await processor.process(job);

    expect(processOrderHistoryRange).toHaveBeenCalledWith(jobData);
  });

  it('processes sync-aftersale-history-range job', async () => {
    const jobData = {
      range: { startTime: 1000, endTime: 2000 },
      timeRangeKey: 'create_time_range' as const,
    };
    const job = {
      name: 'sync-aftersale-history-range',
      data: jobData,
    } as Job;

    await processor.process(job);

    expect(processAftersaleHistoryRange).toHaveBeenCalledWith(jobData);
  });
});
