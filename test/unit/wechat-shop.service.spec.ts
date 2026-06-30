import 'dotenv/config';
import {
  OrderStatus,
  PrismaClient,
  RefundChannel,
  RefundStatus,
} from '@prisma/client';
import { WechatShopRepository } from '@/wechat-shop/repositories';
import { WechatShopOrderClientService } from '@/wechat-shop/service/wechat-shop-order-client.service';
import { WechatShopService } from '@/wechat-shop/service/wechat-shop.service';

const runManualWechatRefundDbTest =
  process.env.RUN_WECHAT_REFUND_DB_TEST === '1';
// 真实数据库写入测试默认跳过，避免平时跑单测时误改测试库。
// 需要手动设置 RUN_WECHAT_REFUND_DB_TEST=1 才会执行。
//RUN_WECHAT_REFUND_DB_TEST=1 npx jest --selectProjects unit --runTestsByPath test/unit/wechat-shop.service.spec.ts --runInBand --testNamePattern='manually upserts a settled WECHAT refund'
const manualDbIt = runManualWechatRefundDbTest ? it : it.skip;

describe('WechatShopService', () => {
  it('syncs refunded wechat orders into order_refunds', async () => {
    // 这里 mock 掉 repository，所以不会连接数据库。
    // create/upsertRefund 只是 Jest 假函数，用来观察 service 会传什么数据。
    const repository = {
      findLatestByExternalId: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) =>
        Promise.resolve({
          id: 'order_1',
          ...data,
        }),
      ),
      update: jest.fn(),
      upsertRefund: jest.fn().mockResolvedValue({ id: 'refund_1' }),
      sumSettledRefundAmountByOrderId: jest.fn().mockResolvedValue(1000),
    };
    // 这里 mock 掉微信小店客户端，所以不会请求真实微信接口。
    // getOrderIds/getOrder 返回一份手写的“微信订单 + 退款信息”。
    const client = {
      getOrderIds: jest.fn().mockResolvedValue({
        order_id_list: ['wx_order_1'],
        next_key: '',
        has_more: false,
      }),
      getOrder: jest.fn().mockResolvedValue({
        order_id: 'wx_order_1',
        create_time: 1_700_000_000,
        update_time: 1_700_000_300,
        status: 30,
        order_detail: {
          product_infos: [
            {
              product_id: 'product_1',
              sku_id: 'sku_1',
              title: '微信小店课程',
              real_price: 1000,
              sku_cnt: 1,
            },
          ],
          pay_info: {
            transaction_id: 'wxpay_1',
            pay_time: 1_700_000_100,
          },
          price_info: {
            order_price: 1000,
          },
          refund_info: {
            refund_status: 1,
            refund_amount: 1000,
            refund_time: 1_700_000_200,
          },
        },
      }),
    };
    const service = new WechatShopService(
      repository as unknown as WechatShopRepository,
      client as unknown as WechatShopOrderClientService,
    );

    // 跑真实的 service 同步流程：
    // 拉订单列表 -> 拉订单详情 -> 映射内部订单 -> 创建订单 -> 同步退款。
    const result = await service.syncWechatOrderPage({
      startTime: 1_700_000_000,
      endTime: 1_700_001_000,
      timeType: 'update',
      pageSize: 10,
    });

    // 验证同步统计：拉到 1 条订单，新建 1 条，没有失败，也没有下一页。
    expect(result).toMatchObject({
      fetched: 1,
      created: 1,
      updated: 0,
      failed: [],
      hasMore: false,
    });
    // 验证创建订单时，微信全额退款被识别成内部 REFUNDED 状态。
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        externalId: 'wx_order_1',
        status: OrderStatus.REFUNDED,
        amount: 1000,
        refundedAt: new Date('2023-11-14T22:16:40.000Z'),
      }),
    );
    // 验证 service 会把退款信息写入 order_refunds。
    // 第一个参数是售后编号；第二、三个参数分别是 upsert 的 create/update 数据。
    expect(repository.upsertRefund).toHaveBeenCalledWith(
      'wechat:wx_order_1:refund',
      expect.objectContaining({
        afterSaleCode: 'wechat:wx_order_1:refund',
        orderId: 'order_1',
        refundChannel: RefundChannel.WECHAT,
        refundAmount: 1000,
        status: RefundStatus.SETTLED,
        refundedAt: new Date('2023-11-14T22:16:40.000Z'),
      }),
      expect.objectContaining({
        orderId: 'order_1',
        refundChannel: RefundChannel.WECHAT,
        refundAmount: 1000,
        status: RefundStatus.SETTLED,
        refundedAt: new Date('2023-11-14T22:16:40.000Z'),
      }),
    );
  });

  it('syncs aftersale list details into order_refunds', async () => {
    const repository = {
      findLatestByExternalId: jest.fn().mockResolvedValue({
        id: 'order_1',
        externalId: 'wx_order_1',
        amount: 1000,
      }),
      create: jest.fn(),
      update: jest.fn(),
      upsertRefund: jest.fn().mockResolvedValue({ id: 'refund_1' }),
      sumSettledRefundAmountByOrderId: jest.fn().mockResolvedValue(1000),
    };
    const client = {
      getAftersaleIds: jest.fn().mockResolvedValue({
        after_sale_order_id_list: ['as_1'],
        next_key: '',
        has_more: false,
      }),
      getAftersale: jest.fn().mockResolvedValue({
        order_id: 'wx_order_1',
        after_sale_order_id: 'as_1',
        status: 'MERCHANT_REFUND_SUCCESS',
        refund_info: {
          amount: 1000,
          refund_reason: 3,
        },
        reason_text: '测试退款用',
        create_time: 1_700_000_100,
        complete_time: 1_700_000_200,
      }),
    };
    const service = new WechatShopService(
      repository as unknown as WechatShopRepository,
      client as unknown as WechatShopOrderClientService,
    );

    const result = await service.syncWechatAftersalePage({
      startTime: 1_700_000_000,
      endTime: 1_700_001_000,
      timeType: 'update',
      pageSize: 10,
    });

    expect(result).toMatchObject({
      fetched: 1,
      synced: 1,
      failed: [],
      hasMore: false,
    });
    expect(client.getAftersale).toHaveBeenCalledWith('as_1');
    expect(repository.upsertRefund).toHaveBeenCalledWith(
      'as_1',
      expect.objectContaining({
        afterSaleCode: 'as_1',
        orderId: 'order_1',
        refundChannel: RefundChannel.WECHAT,
        refundAmount: 1000,
        refundReason: '测试退款用',
        status: RefundStatus.SETTLED,
        submittedAt: new Date('2023-11-14T22:15:00.000Z'),
        refundedAt: new Date('2023-11-14T22:16:40.000Z'),
      }),
      expect.objectContaining({
        orderId: 'order_1',
        refundChannel: RefundChannel.WECHAT,
        refundAmount: 1000,
        refundReason: '测试退款用',
        status: RefundStatus.SETTLED,
        submittedAt: new Date('2023-11-14T22:15:00.000Z'),
        refundedAt: new Date('2023-11-14T22:16:40.000Z'),
      }),
    );
    expect(repository.update).toHaveBeenCalledWith(
      'order_1',
      expect.objectContaining({
        status: OrderStatus.REFUNDED,
        refundedAt: new Date('2023-11-14T22:16:40.000Z'),
      }),
    );
  });

  manualDbIt(
    'manually upserts a settled WECHAT refund for the sandbox order',
    async () => {
      // 这个用例会连接 .env 里的 DATABASE_URL，是真实写库测试。
      const prisma = new PrismaClient();
      const orderId = 'cmq83w6a20000zai0z0d316ec';
      const externalId = 'sandbox_1685577600_0001';
      // afterSaleCode 在 order_refunds 表里是唯一键。
      // 使用固定值做 upsert，重复执行会更新同一条退款记录，不会插入多条。
      const afterSaleCode = `wechat:${externalId}:refund:test`;
      const refundedAt = new Date('2026-06-29T11:17:09.558Z');

      try {
        // 订单和退款放在同一个事务里，避免只写了一边导致数据不一致。
        const result = await prisma.$transaction(async (tx) => {
          // 先确认目标订单存在，并读取订单金额。
          // 退款金额直接使用订单原价，模拟“全额退款”。
          const order = await tx.order.findFirst({
            where: {
              OR: [{ id: orderId }, { externalId }],
              deletedAt: null,
            },
            select: {
              id: true,
              externalId: true,
              amount: true,
            },
          });

          if (!order) {
            throw new Error(`Order not found: ${orderId} / ${externalId}`);
          }

          // 幂等写入退款明细：
          // 不存在则 create，已存在则 update，渠道默认按本次需求写 WECHAT。
          const refund = await tx.orderRefund.upsert({
            where: { afterSaleCode },
            create: {
              afterSaleCode,
              orderId: order.id,
              refundChannel: RefundChannel.WECHAT,
              refundAmount: order.amount,
              refundReason: '测试退款用',
              status: RefundStatus.SETTLED,
              submittedAt: refundedAt,
              refundedAt,
            },
            update: {
              orderId: order.id,
              refundChannel: RefundChannel.WECHAT,
              refundAmount: order.amount,
              refundReason: '测试退款用',
              status: RefundStatus.SETTLED,
              submittedAt: refundedAt,
              refundedAt,
              deletedAt: null,
            },
          });

          // 因为这里模拟的是全额且已结算退款，所以主订单也同步改为 REFUNDED。
          const updatedOrder = await tx.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.REFUNDED,
              refundedAt,
            },
            select: {
              id: true,
              externalId: true,
              amount: true,
              status: true,
              refundedAt: true,
            },
          });

          return { refund, updatedOrder };
        });

        // 回读事务结果，确认 orders 表已经是 REFUNDED。
        expect(result.updatedOrder).toMatchObject({
          id: orderId,
          externalId,
          amount: 9901,
          status: OrderStatus.REFUNDED,
          refundedAt,
        });
        // 确认 order_refunds 表写入的是 WECHAT 渠道、原价金额和测试退款原因。
        expect(result.refund).toMatchObject({
          afterSaleCode,
          orderId,
          refundChannel: RefundChannel.WECHAT,
          refundAmount: 9901,
          refundReason: '测试退款用',
          status: RefundStatus.SETTLED,
          submittedAt: refundedAt,
          refundedAt,
          deletedAt: null,
        });
      } finally {
        // 真实 Prisma Client 要显式断开，否则 Jest 可能因为连接未关闭而不退出。
        await prisma.$disconnect();
      }
    },
    30_000,
  );
});
