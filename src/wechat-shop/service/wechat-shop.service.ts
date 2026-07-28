import { BadRequestException, Injectable } from '@nestjs/common';
import { WechatOrderHistorySyncDto } from '../dto/wechat-order-history-sync.dto';
import { WechatOrderWebhookDto } from '../dto/wechat-order-webhook.dto';
import { WechatShopRepository } from '../repositories';
import {
  DEFAULT_WECHAT_ORDER_PAGE_SIZE,
  splitWechatOrderRanges,
  toUnixSeconds,
} from '../utils/wechat-order-sync.util';
import { WechatShopClientService } from './wechat-shop-client.service';
import { generateOrderCode } from '../utils/order-number.util';
import {
  buildCreateData,
  buildUpdateData,
  mapWechatShopOrderToWebhookPayload,
} from '../utils/wechat-order.mapper';
import {
  SyncWechatOrderPageParams,
  SyncWechatOrderPageResult,
} from '../types/wechat-shop.types';

@Injectable()
export class WechatShopService {
  constructor(
    private readonly wechatShopRepository: WechatShopRepository,
    private readonly wechatShopClient: WechatShopClientService,
  ) {}

  /**
   * 飞书集成平台已经把微信小店原始字段转换成内部字段。
   * 这里仅按外部订单号做幂等写入：存在则更新，不存在则创建。
   */
  async upsertWechatOrder(payload: WechatOrderWebhookDto) {
    const existingOrder =
      await this.wechatShopRepository.findLatestByExternalId(payload.orderId);

    if (existingOrder) {
      const order = await this.wechatShopRepository.update(
        existingOrder.id,
        buildUpdateData(payload),
      );

      return { action: 'updated' as const, order };
    }

    const orderCode = generateOrderCode();
    const order = await this.wechatShopRepository.create(
      buildCreateData(payload, orderCode),
    );

    return { action: 'created' as const, order };
  }

  /**
   * 按微信小店创建/更新时间范围分页拉取历史订单，并复用单条订单写入逻辑。
   * 微信接口单次时间范围不超过 7 天，这里会自动切片完整覆盖请求区间。
   */
  async syncWechatOrderHistory(payload: WechatOrderHistorySyncDto) {
    const startTime = toUnixSeconds(payload.startTime, 'startTime');
    const endTime = toUnixSeconds(payload.endTime, 'endTime');

    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be earlier than endTime');
    }

    const pageSize = payload.pageSize ?? DEFAULT_WECHAT_ORDER_PAGE_SIZE;
    const timeType = payload.timeType ?? 'create';
    let fetched = 0;
    let created = 0;
    let updated = 0;
    const failed: Array<{ orderId: string; reason: string }> = [];

    for (const range of splitWechatOrderRanges(startTime, endTime)) {
      let nextKey = '';
      let hasMore = true;

      while (hasMore) {
        const result = await this.syncWechatOrderPage({
          startTime: range.startTime,
          endTime: range.endTime,
          timeType,
          pageSize,
          nextKey,
        });

        fetched += result.fetched;
        created += result.created;
        updated += result.updated;
        failed.push(...result.failed);
        nextKey = result.nextKey;
        hasMore = result.hasMore;
      }
    }

    return {
      fetched,
      created,
      updated,
      failedCount: failed.length,
      failed,
    };
  }

  async syncWechatOrderPage(
    params: SyncWechatOrderPageParams,
  ): Promise<SyncWechatOrderPageResult> {
    const timeRange = { startTime: params.startTime, endTime: params.endTime };
    const listResult = await this.wechatShopClient.getOrderList({
      ...(params.timeType === 'update'
        ? { updateTimeRange: timeRange }
        : { createTimeRange: timeRange }),
      pageSize: params.pageSize,
      nextKey: params.nextKey ?? '',
    });
    const orderIds = listResult.order_id_list ?? listResult.orders ?? [];
    let created = 0;
    let updated = 0;
    const failed: Array<{ orderId: string; reason: string }> = [];

    for (const orderId of orderIds.map(String)) {
      try {
        const wechatOrder = await this.wechatShopClient.getOrder(orderId);
        const mappedPayload = mapWechatShopOrderToWebhookPayload(
          wechatOrder,
          orderId,
        );

        const result = await this.upsertWechatOrder(mappedPayload);
        if (result.action === 'created') created += 1;
        if (result.action === 'updated') updated += 1;
      } catch (error) {
        failed.push({
          orderId,
          reason: error instanceof Error ? error.message : 'Unknown sync error',
        });
      }
    }

    const nextKey = listResult.next_key ?? '';

    return {
      fetched: orderIds.length,
      created,
      updated,
      failed,
      nextKey,
      hasMore: Boolean(listResult.has_more && nextKey),
    };
  }

  /**
   * 同步单条订单，通常用于接收到单条订单通知时使用
   */
  async syncSingleOrder(orderId: string) {
    const wechatOrder = await this.wechatShopClient.getOrder(orderId);
    const mappedPayload = mapWechatShopOrderToWebhookPayload(
      wechatOrder,
      orderId,
    );

    return this.upsertWechatOrder(mappedPayload);
  }
}
