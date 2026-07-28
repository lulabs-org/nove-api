import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WechatOrderHistorySyncDto } from '../dto/wechat-order-history-sync.dto';
import { Prisma, PaymentProvider } from '@prisma/client';
import { WechatShopRepository } from '../repositories';
import {
  DEFAULT_WECHAT_ORDER_PAGE_SIZE,
  splitWechatOrderRanges,
  toUnixSeconds,
} from '../utils/wechat-order-sync.util';
import { WechatShopClientService } from './wechat-shop-client.service';
import {
  generateOrderCode,
  encodeOrderNumber,
} from '../utils/order-number.util';
import { mapWechatShopStatus } from '../utils/wechat-order.mapper';

@Injectable()
export class WechatShopOrderService {
  constructor(
    private readonly wechatShopRepository: WechatShopRepository,
    private readonly wechatShopClient: WechatShopClientService,
    @InjectQueue('wechat-order-sync') private orderQueue: Queue,
  ) {}

  /**
   * 针对微信订单号主动拉取，并进行同步写入。
   */
  async syncSingle(orderId: string) {
    const wechatOrder = await this.wechatShopClient.getOrder(orderId);

    const product = wechatOrder.order_detail?.product_infos?.[0];
    const payInfo = wechatOrder.order_detail?.pay_info;
    const priceInfo = wechatOrder.order_detail?.price_info;
    const addressInfo = wechatOrder.order_detail?.delivery_info?.address_info;

    const metadata = {
      source: 'wechat_shop_history_sync',
      openid: wechatOrder.openid,
      unionid: wechatOrder.unionid,
    };

    const orderData = {
      status: mapWechatShopStatus(wechatOrder.status),
      paidAt: payInfo?.pay_time ? new Date(payInfo.pay_time * 1000) : undefined,
      amount: priceInfo?.order_price,
      paymentProvider: payInfo?.transaction_id
        ? PaymentProvider.WECHAT
        : undefined,
      providerTradeNo: payInfo?.transaction_id,
      productName: product?.title,
      phone: addressInfo?.tel_number,
      externalId: String(wechatOrder.order_id),
      metadata: metadata as Prisma.InputJsonValue,
    };

    return this.wechatShopRepository.upsert({
      externalId: orderData.externalId,
      create: () => {
        const orderCode = generateOrderCode();
        return {
          ...orderData,
          orderCode,
          orderNumber: encodeOrderNumber(orderCode),
          amount: orderData.amount ?? 0,
        };
      },
      update: orderData,
    });
  }

  /**
   * 按微信小店创建/更新时间范围分页拉取历史订单，并将单条订单通过 BullMQ 分发异步同步。
   * 微信接口单次时间范围不超过 7 天，这里会自动切片完整覆盖请求区间。
   */
  async syncHistory(payload: WechatOrderHistorySyncDto) {
    const {
      startTime: startStr,
      endTime: endStr,
      pageSize = DEFAULT_WECHAT_ORDER_PAGE_SIZE,
      timeType = 'create',
    } = payload;

    const startTime = toUnixSeconds(startStr);
    const endTime = toUnixSeconds(endStr);

    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be earlier than endTime');
    }

    const timeRangeKey =
      timeType === 'update' ? 'updateTimeRange' : 'createTimeRange';
    let enqueued = 0;

    for (const range of splitWechatOrderRanges(startTime, endTime)) {
      let nextKey = '';
      let hasMore = true;

      while (hasMore) {
        const listResult = await this.wechatShopClient.getOrderList({
          [timeRangeKey]: range,
          pageSize,
          nextKey,
        });

        const orderIds = listResult.order_id_list ?? listResult.orders ?? [];

        if (orderIds.length > 0) {
          const jobs = orderIds.map((id) => ({
            name: 'sync-single-order',
            data: { orderId: String(id) },
          }));

          await this.orderQueue.addBulk(jobs);
          enqueued += orderIds.length;
        }

        nextKey = listResult.next_key ?? '';
        hasMore = Boolean(listResult.has_more && nextKey);
      }
    }

    return { enqueued };
  }
}
