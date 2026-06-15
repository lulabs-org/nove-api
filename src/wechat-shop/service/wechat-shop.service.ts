import { randomInt, createHash } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Currency, OrderStatus, PaymentProvider, Prisma } from '@prisma/client';
import { WechatOrderHistorySyncDto } from '../dto/wechat-order-history-sync.dto';
import { WechatOrderWebhookDto } from '../dto/wechat-order-webhook.dto';
import { WechatShopRepository } from '../repositories';
import { WechatShopOrder } from '../types/wechat-shop.types';
import {
  DEFAULT_WECHAT_ORDER_PAGE_SIZE,
  splitWechatOrderRanges,
  toUnixSeconds,
  unixSecondsToISOString,
} from '../utils/wechat-order-sync.util';
import { WechatShopOrderClientService } from './wechat-shop-order-client.service';

const ORDER_NUMBER_MASK = 0x5a17c3e5b79fn;
const ORDER_CODE_RANDOM_SUFFIX_MAX = 1_000_000;

export interface SyncWechatOrderPageParams {
  startTime: number;
  endTime: number;
  timeType: 'create' | 'update';
  pageSize: number;
  nextKey?: string | null;
}

export interface SyncWechatOrderPageResult {
  fetched: number;
  created: number;
  updated: number;
  failed: Array<{ orderId: string; reason: string }>;
  nextKey: string;
  hasMore: boolean;
}

@Injectable()
export class WechatShopService {
  constructor(
    private readonly wechatShopRepository: WechatShopRepository,
    private readonly wechatShopOrderClient: WechatShopOrderClientService,
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
        this.buildUpdateData(payload),
      );

      return { action: 'updated' as const, order };
    }

    const orderCode = this.generateOrderCode();
    const order = await this.wechatShopRepository.create(
      this.buildCreateData(payload, orderCode),
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
    const listResult = await this.wechatShopOrderClient.getOrderIds({
      startTime: params.startTime,
      endTime: params.endTime,
      timeType: params.timeType,
      pageSize: params.pageSize,
      nextKey: params.nextKey ?? '',
    });
    const orderIds = listResult.order_id_list ?? listResult.orders ?? [];
    let created = 0;
    let updated = 0;
    const failed: Array<{ orderId: string; reason: string }> = [];

    for (const orderId of orderIds.map(String)) {
      try {
        const wechatOrder = await this.wechatShopOrderClient.getOrder(orderId);
        const mappedPayload = this.mapWechatShopOrderToWebhookPayload(
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
   * 创建订单时补齐系统生成的订单号、默认币种和必填金额。
   */
  private buildCreateData(
    payload: WechatOrderWebhookDto,
    orderCode: string,
  ): Prisma.OrderUncheckedCreateInput {
    return this.assignOptionalFields(
      {
        orderCode,
        orderNumber: this.encodeOrderNumber(orderCode),
        amount: payload.amount ?? 0,
        currency: Currency.CNY,
        externalId: payload.orderId,
        metadata: (payload.metadata ?? payload) as Prisma.InputJsonValue,
      },
      payload,
    );
  }

  /**
   * 更新订单时只同步外部平台字段，不重新生成订单号。
   */
  private buildUpdateData(
    payload: WechatOrderWebhookDto,
  ): Prisma.OrderUncheckedUpdateInput {
    return this.assignOptionalFields(
      {
        externalId: payload.orderId,
        metadata: (payload.metadata ?? payload) as Prisma.InputJsonValue,
      },
      payload,
    );
  }

  /**
   * create/update 共用的可选字段赋值逻辑。
   * 只写入有值字段，避免外部空字段覆盖已有订单信息。
   */
  private assignOptionalFields<
    T extends
      | Prisma.OrderUncheckedCreateInput
      | Prisma.OrderUncheckedUpdateInput,
  >(data: T, payload: WechatOrderWebhookDto): T {
    if (payload.status) data.status = payload.status;
    if (payload.paidAt) data.paidAt = new Date(payload.paidAt);
    if (payload.amount !== undefined) data.amount = payload.amount;
    if (payload.paymentProvider) data.paymentProvider = payload.paymentProvider;
    if (payload.providerTradeNo) data.providerTradeNo = payload.providerTradeNo;
    if (payload.productId) data.productId = payload.productId;
    if (payload.productName) data.productName = payload.productName;
    if (payload.phone) data.phone = payload.phone;

    return data;
  }

  private mapWechatShopOrderToWebhookPayload(
    order: WechatShopOrder,
    fallbackOrderId: string,
  ): WechatOrderWebhookDto {
    const product = order.order_detail?.product_infos?.[0];
    const payInfo = order.order_detail?.pay_info;
    const priceInfo = order.order_detail?.price_info;
    const addressInfo = order.order_detail?.delivery_info?.address_info;
    const orderId = String(order.order_id ?? fallbackOrderId);

    return {
      orderId,
      status: this.mapWechatShopStatus(order.status, order),
      externalCreatedAt: unixSecondsToISOString(order.create_time),
      externalUpdatedAt: unixSecondsToISOString(order.update_time),
      paidAt: unixSecondsToISOString(payInfo?.pay_time),
      amount: this.resolveWechatOrderAmount(order),
      paymentProvider: payInfo?.transaction_id
        ? PaymentProvider.WECHAT
        : undefined,
      providerTradeNo: payInfo?.transaction_id,
      productName: product?.title,
      phone: addressInfo?.tel_number,
      metadata: {
        source: 'wechat_shop_history_sync',
        rawOrder: order,
        mapped: {
          orderId,
          productId: product?.product_id,
          skuId: product?.sku_id,
          skuCode: product?.sku_code,
          orderPrice: priceInfo?.order_price,
          openid: order.openid,
          unionid: order.unionid,
        },
      },
    };
  }

  private mapWechatShopStatus(
    status: number | undefined,
    order: WechatShopOrder,
  ): OrderStatus | undefined {
    if (this.hasWechatRefund(order)) return OrderStatus.REFUNDED;

    switch (status) {
      case 10:
      case 12:
      case 13:
        return OrderStatus.UNPAID;
      case 20:
      case 21:
      case 30:
        return OrderStatus.PAID;
      case 100:
        return OrderStatus.COMPLETED;
      case 250:
        return OrderStatus.CANCELLED;
      default:
        return undefined;
    }
  }

  private hasWechatRefund(order: WechatShopOrder): boolean {
    const refundInfo = order.order_detail?.refund_info;

    return Boolean(
      refundInfo?.amount ||
        refundInfo?.refund_amount ||
        refundInfo?.refund_status,
    );
  }

  private resolveWechatOrderAmount(order: WechatShopOrder): number | undefined {
    const orderPrice = order.order_detail?.price_info?.order_price;
    if (typeof orderPrice === 'number') return orderPrice;

    return order.order_detail?.product_infos?.reduce((total, product) => {
      const price = product.real_price ?? product.sale_price ?? 0;
      const count = product.sku_cnt ?? 1;

      return total + price * count;
    }, 0);
  }

  /**
   * 生成内部订单号：时间戳 + 随机后缀，避免依赖数据库序列。
   */
  private generateOrderCode(): string {
    const timestamp = Date.now().toString();
    const randomSuffix = randomInt(ORDER_CODE_RANDOM_SUFFIX_MAX)
      .toString()
      .padStart(6, '0');

    return `${timestamp}${randomSuffix}`;
  }

  /**
   * 对外展示订单号由内部订单号编码得到，避免直接暴露连续数字。
   */
  private encodeOrderNumber(orderCode: string): string {
    try {
      const encoded = BigInt(orderCode) ^ ORDER_NUMBER_MASK;

      return encoded.toString(36).toUpperCase();
    } catch {
      // Fallback: stable hash-based encoding when orderCode is not a valid integer
      const hash = createHash('sha256').update(String(orderCode)).digest('hex');
      // take a prefix of the hex hash and convert to BigInt for base36 encoding
      const prefix = hash.slice(0, 12); // 12 hex chars -> up to 48 bits
      const safeBigInt = BigInt('0x' + prefix);

      return safeBigInt.toString(36).toUpperCase();
    }
  }
}
