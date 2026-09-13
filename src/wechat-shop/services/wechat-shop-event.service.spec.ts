import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { WechatShopEventService } from './wechat-shop-event.service';
import { WechatShopOrderService } from './wechat-shop-order.service';

describe('WechatShopEventService', () => {
  let service: WechatShopEventService;
  const syncSingleOrder = jest.fn();
  const queueAdd = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockOrderService = {
      syncSingle: syncSingleOrder,
    };

    const mockQueue = {
      add: queueAdd,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WechatShopEventService,
        { provide: WechatShopOrderService, useValue: mockOrderService },
        { provide: getQueueToken('wechat-order-sync'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<WechatShopEventService>(WechatShopEventService);
  });

  describe('channels_ec_order_settle', () => {
    it('successfully processes order settle event and invokes syncSingle with settleTime', async () => {
      const eventPayload = {
        ToUserName: 'gh_123456',
        FromUserName: 'openid_abc',
        CreateTime: 1662480000,
        MsgType: 'event',
        Event: 'channels_ec_order_settle',
        order_info: {
          order_id: 123456789,
          settle_time: 1662480000,
        },
      };

      await service.handleWechatEvent(eventPayload);

      expect(syncSingleOrder).toHaveBeenCalledWith('123456789', {
        settleTime: 1662480000,
      });
    });

    it('successfully processes order settle event when order_id is string', async () => {
      const eventPayload = {
        ToUserName: 'gh_123456',
        FromUserName: 'openid_abc',
        CreateTime: 1662480000,
        MsgType: 'event',
        Event: 'channels_ec_order_settle',
        order_info: {
          order_id: '3705115058471208928',
          settle_time: 1662480000,
        },
      };

      await service.handleWechatEvent(eventPayload);

      expect(syncSingleOrder).toHaveBeenCalledWith('3705115058471208928', {
        settleTime: 1662480000,
      });
    });

    it('catches and logs error when order_id is missing', async () => {
      const eventPayload = {
        ToUserName: 'gh_123456',
        FromUserName: 'openid_abc',
        CreateTime: 1662480000,
        MsgType: 'event',
        Event: 'channels_ec_order_settle',
        order_info: {
          settle_time: 1662480000,
        },
      };

      // Should not throw
      await expect(
        service.handleWechatEvent(eventPayload as Record<string, unknown>),
      ).resolves.not.toThrow();

      expect(syncSingleOrder).not.toHaveBeenCalled();
    });
  });

  describe('channels_ec_order_pay', () => {
    it('successfully processes order pay event and invokes syncSingle', async () => {
      const eventPayload = {
        ToUserName: 'gh_123456',
        FromUserName: 'openid_abc',
        CreateTime: 1662480000,
        MsgType: 'event',
        Event: 'channels_ec_order_pay',
        order_info: {
          order_id: '123456789',
          pay_time: 1662480000,
        },
      };

      await service.handleWechatEvent(eventPayload);

      expect(syncSingleOrder).toHaveBeenCalledWith('123456789');
    });
  });

  describe('channels_ec_aftersale_update', () => {
    it('enqueues sync-single-aftersale job', async () => {
      const eventPayload = {
        ToUserName: 'gh_123456',
        FromUserName: 'openid_abc',
        CreateTime: 1662480000,
        MsgType: 'event',
        Event: 'channels_ec_aftersale_update',
        finder_shop_aftersale_status_update: {
          status: 'MERCHANT_REFUND_SUCCESS',
          after_sale_order_id: 'aftersale_999',
          order_id: '123456789',
        },
      };

      await service.handleWechatEvent(eventPayload);

      expect(queueAdd).toHaveBeenCalledWith(
        'sync-single-aftersale',
        { afterSaleOrderId: 'aftersale_999' },
        expect.objectContaining({ attempts: 5 }),
      );
    });
  });

  describe('unknown events', () => {
    it('gracefully ignores unrecognized event types', async () => {
      const eventPayload = {
        Event: 'channels_ec_unknown_event',
      };

      await expect(
        service.handleWechatEvent(eventPayload),
      ).resolves.not.toThrow();

      expect(syncSingleOrder).not.toHaveBeenCalled();
      expect(queueAdd).not.toHaveBeenCalled();
    });
  });
});
