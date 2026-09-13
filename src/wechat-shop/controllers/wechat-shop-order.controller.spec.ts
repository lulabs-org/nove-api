import { Test, TestingModule } from '@nestjs/testing';
import { WechatShopOrderController } from './wechat-shop-order.controller';
import { WechatShopOrderService } from '../services/wechat-shop-order.service';
import { WechatShopAftersaleService } from '../services/wechat-shop-aftersale.service';

describe('WechatShopOrderController', () => {
  let controller: WechatShopOrderController;
  const orderSyncHistory = jest.fn();
  const aftersaleSyncHistory = jest.fn();
  const getAftersaleList = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockOrderService = {
      syncHistory: orderSyncHistory,
    } as unknown as WechatShopOrderService;

    const mockAftersaleService = {
      syncHistory: aftersaleSyncHistory,
      getAftersaleList,
    } as unknown as WechatShopAftersaleService;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WechatShopOrderController],
      providers: [
        { provide: WechatShopOrderService, useValue: mockOrderService },
        { provide: WechatShopAftersaleService, useValue: mockAftersaleService },
      ],
    }).compile();

    controller = module.get<WechatShopOrderController>(
      WechatShopOrderController,
    );
  });

  describe('syncHistory', () => {
    it('delegates order sync to orderService.syncHistory', async () => {
      orderSyncHistory.mockResolvedValue({ enqueuedRangeTasks: 2 });

      const payload = {
        create_time_range: {
          start_time: '2026-01-01T00:00:00.000Z',
          end_time: '2026-01-08T00:00:00.000Z',
        },
      };

      const res = await controller.syncHistory(payload);

      expect(orderSyncHistory).toHaveBeenCalledWith(payload);
      expect(res).toEqual({
        success: true,
        result: { enqueuedRangeTasks: 2 },
      });
    });
  });

  describe('syncAftersaleHistory', () => {
    it('delegates aftersale sync to aftersaleService.syncHistory', async () => {
      aftersaleSyncHistory.mockResolvedValue({ enqueuedRangeTasks: 5 });

      const payload = {
        create_time_range: {
          start_time: '2026-01-01T00:00:00.000Z',
          end_time: '2026-01-05T00:00:00.000Z',
        },
      };

      const res = await controller.syncAftersaleHistory(payload);

      expect(aftersaleSyncHistory).toHaveBeenCalledWith(payload);
      expect(res).toEqual({
        success: true,
        result: { enqueuedRangeTasks: 5 },
      });
    });
  });

  describe('getAftersaleList', () => {
    it('delegates batch aftersale query to aftersaleService.getAftersaleList', async () => {
      const mockResult = {
        errcode: 0,
        errmsg: 'ok',
        after_sale_order_id_list: ['aftersale-1', 'aftersale-2'],
        has_more: false,
      };
      getAftersaleList.mockResolvedValue(mockResult);

      const query = {
        begin_create_time: 1700000000,
        end_create_time: 1700086400,
      };

      const res = await controller.getAftersaleList(query);

      expect(getAftersaleList).toHaveBeenCalledWith(query);
      expect(res).toEqual({
        success: true,
        result: mockResult,
      });
    });
  });
});
