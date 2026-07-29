import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WechatOrderHistorySyncDto } from '../dto/wechat-order-history-sync.dto';
import { Prisma, PaymentProvider } from '@prisma/client';
import { WechatShopRepository } from '../repositories';
import {
  splitTimeRanges,
  WechatOrderUnixRange,
} from '../utils/wechat-order-sync.util';
import { WechatShopClientService } from './wechat-shop-client.service';
import {
  generateOrderCode,
  encodeOrderNumber,
} from '../utils/order-number.util';
import { mapWechatShopStatus } from '../utils/wechat-order.mapper';

const DEFAULT_PAGE_SIZE = 100;

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
    const { order } = await this.wechatShopClient.getOrder(orderId);
    if (!order) return;

    const {
      product_infos: [product] = [],
      pay_info: payInfo,
      price_info: priceInfo,
      delivery_info: deliveryInfo,
    } = order.order_detail ?? {};

    const addressInfo = deliveryInfo?.address_info;

    const orderData = {
      status: mapWechatShopStatus(order.status),
      paidAt: payInfo?.pay_time ? new Date(payInfo.pay_time * 1000) : undefined,
      amount: priceInfo?.order_price,
      paymentProvider: payInfo?.transaction_id
        ? PaymentProvider.WECHAT
        : undefined,
      providerTradeNo: payInfo?.transaction_id,
      productName: product?.title,
      phone:
        addressInfo?.tel_number ||
        addressInfo?.virtual_order_tel_number ||
        addressInfo?.purchaser_tel_number,
      phoneCode: '+86',
      externalId: String(order.order_id),
      metadata: {
        source: 'wechat_shop_history_sync',
        openid: order.openid,
        unionid: order.unionid,
      } as Prisma.InputJsonValue,
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
   * 接收历史订单同步请求，支持最大 1 年时间跨度。
   * 为防止接口超时，直接将切片后的 7 天任务分发到 BullMQ 异步处理。
   */
  async syncHistory(payload: WechatOrderHistorySyncDto) {
    const timeRangeKey = payload.update_time_range
      ? 'update_time_range'
      : 'create_time_range';
    const timeRange = payload[timeRangeKey];

    if (!timeRange) {
      throw new BadRequestException(
        'At least one of create_time_range or update_time_range must be provided',
      );
    }

    const startTime = Math.floor(
      new Date(timeRange.start_time).getTime() / 1000,
    );
    const endTime = Math.floor(new Date(timeRange.end_time).getTime() / 1000);

    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be earlier than endTime');
    }

    const ONE_YEAR_SECONDS = 366 * 24 * 60 * 60;
    if (endTime - startTime > ONE_YEAR_SECONDS) {
      throw new BadRequestException('Time range cannot exceed 1 year');
    }

    const jobs = splitTimeRanges(startTime, endTime).map((range) => ({
      name: 'sync-history-range',
      data: { range, pageSize: DEFAULT_PAGE_SIZE, timeRangeKey },
    }));

    await this.orderQueue.addBulk(jobs);

    return { enqueuedRangeTasks: jobs.length };
  }

  /**
   * 后台异步处理单个时间片（最大 7 天）的订单拉取
   */
  async processHistoryRange(data: {
    range: WechatOrderUnixRange;
    pageSize: number;
    timeRangeKey: 'create_time_range' | 'update_time_range';
  }) {
    const { range, pageSize, timeRangeKey } = data;

    let nextKey: string | undefined;
    let hasMore = true;
    let enqueued = 0;

    while (hasMore) {
      const {
        order_id_list = [],
        has_more,
        next_key,
      } = await this.wechatShopClient.getOrderList({
        [timeRangeKey]: {
          start_time: range.startTime,
          end_time: range.endTime,
        },
        page_size: pageSize,
        next_key: nextKey,
      });

      if (order_id_list.length > 0) {
        const jobs = order_id_list.map((id) => ({
          name: 'sync-single-order',
          data: { orderId: String(id) },
        }));
        await this.orderQueue.addBulk(jobs);
        enqueued += order_id_list.length;
      }

      nextKey = next_key;
      hasMore = Boolean(has_more && nextKey);
    }

    return { enqueued };
  }
}
