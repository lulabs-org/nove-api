import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { OrderStatus, PaymentProvider } from '@prisma/client';
import { WechatShopOrderService } from './wechat-shop-order.service';
import { WechatShopRepository } from '../repositories';
import { WechatShopClientService } from './wechat-shop-client.service';
import { UserQueryRepository } from '@/user/repositories/user-query.repository';
import { UserCommandRepository } from '@/user/repositories/user-command.repository';

describe('WechatShopOrderService', () => {
  let service: WechatShopOrderService;
  const mockRepositoryUpsert = jest.fn();
  const mockGetOrder = jest.fn();
  const mockByPhone = jest.fn();
  const mockCreateWithProfile = jest.fn();
  const mockQueue = { addBulk: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WechatShopOrderService,
        {
          provide: WechatShopRepository,
          useValue: { upsert: mockRepositoryUpsert },
        },
        {
          provide: WechatShopClientService,
          useValue: { getOrder: mockGetOrder },
        },
        {
          provide: UserQueryRepository,
          useValue: { byPhone: mockByPhone },
        },
        {
          provide: UserCommandRepository,
          useValue: { createWithProfile: mockCreateWithProfile },
        },
        {
          provide: getQueueToken('wechat-order-sync'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<WechatShopOrderService>(WechatShopOrderService);
  });

  describe('syncSingle with settle_info and settled_at', () => {
    it('sets settledAt, settleInfo, and COMPLETED status when order settles with settleTime option', async () => {
      mockGetOrder.mockResolvedValue({
        order: {
          order_id: '3705115058471208928',
          status: 100,
          update_time: 1662480000,
          openid: 'openid_123',
          unionid: 'unionid_456',
          order_detail: {
            product_infos: [{ title: '测试商品' }],
            pay_info: {
              pay_time: 1662000000,
              transaction_id: 'wx_tx_123',
            },
            price_info: {
              order_price: 9900,
            },
            delivery_info: {
              address_info: {
                tel_number: '13800138000',
                user_name: '张三',
              },
            },
            settle_info: {
              settle_time: 1662480000,
              commission_fee: 100,
              predict_commission_fee: 100,
            },
          },
        },
      });

      mockByPhone.mockResolvedValue({ id: 'user_1' });

      mockRepositoryUpsert.mockResolvedValue({
        action: 'updated',
        order: {
          id: 'local_order_1',
          settledAt: new Date(1662480000 * 1000),
          settleInfo: {
            settle_time: 1662480000,
            commission_fee: 100,
            predict_commission_fee: 100,
          },
          status: OrderStatus.COMPLETED,
        },
        previous: {
          id: 'local_order_1',
          settledAt: null,
          settleInfo: null,
          status: OrderStatus.PAID,
        },
      });

      await service.syncSingle('3705115058471208928', {
        settleTime: 1662480000,
      });

      expect(mockRepositoryUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          externalId: '3705115058471208928',
          update: expect.objectContaining({
            settledAt: new Date(1662480000 * 1000),
            settleInfo: {
              settle_time: 1662480000,
              commission_fee: 100,
              predict_commission_fee: 100,
            },
            status: OrderStatus.COMPLETED,
            paymentProvider: PaymentProvider.WECHAT,
          }),
        }),
      );

      // Verify financialClosedAt is not set by external settlement sync
      const callArgs = mockRepositoryUpsert.mock.calls[0][0];
      expect(callArgs.update.financialClosedAt).toBeUndefined();
    });

    it('extracts settle_time and fee details from order_detail.settle_info when options.settleTime is not provided', async () => {
      mockGetOrder.mockResolvedValue({
        order: {
          order_id: 'order_abc',
          status: 100,
          order_detail: {
            settle_info: {
              settle_time: 1662480000,
              commission_fee: 250,
            },
          },
        },
      });

      mockRepositoryUpsert.mockResolvedValue({
        action: 'created',
        order: {
          id: 'local_order_new',
          settledAt: new Date(1662480000 * 1000),
          settleInfo: {
            settle_time: 1662480000,
            commission_fee: 250,
          },
        },
        previous: null,
      });

      await service.syncSingle('order_abc');

      expect(mockRepositoryUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            settledAt: new Date(1662480000 * 1000),
            settleInfo: {
              settle_time: 1662480000,
              commission_fee: 250,
            },
          }),
        }),
      );
    });

    it('constructs settleInfo fallback when only options.settleTime is available', async () => {
      mockGetOrder.mockResolvedValue({
        order: {
          order_id: 'order_def',
          status: 100,
          order_detail: {},
        },
      });

      mockRepositoryUpsert.mockResolvedValue({
        action: 'updated',
        order: {
          id: 'local_order_def',
          settledAt: new Date(1662480000 * 1000),
          settleInfo: { settle_time: 1662480000 },
        },
        previous: null,
      });

      await service.syncSingle('order_def', { settleTime: 1662480000 });

      expect(mockRepositoryUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            settledAt: new Date(1662480000 * 1000),
            settleInfo: {
              settle_time: 1662480000,
            },
          }),
        }),
      );
    });
  });
});
