import { randomInt, createHash } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Currency,
  Order,
  OrderStatus,
  PaymentProvider,
  Prisma,
  RefundChannel,
  RefundStatus,
} from '@prisma/client';
import { WechatOrderHistorySyncDto } from '../dto/wechat-order-history-sync.dto';
import { WechatOrderWebhookDto } from '../dto/wechat-order-webhook.dto';
import { WechatShopRepository } from '../repositories';
import {
  WechatShopAftersaleDetail,
  WechatShopAftersaleListResponse,
  WechatShopOrder,
} from '../types/wechat-shop.types';
import {
  DEFAULT_WECHAT_ORDER_PAGE_SIZE,
  splitWechatOrderRanges,
  toUnixSeconds,
  unixSecondsToISOString,
} from '../utils/wechat-order-sync.util';
import { WechatShopOrderClientService } from './wechat-shop-order-client.service';

const ORDER_NUMBER_MASK = 0x5a17c3e5b79fn;
const ORDER_CODE_RANDOM_SUFFIX_MAX = 1_000_000;
// 微信售后列表接口单次查询时间范围上限为 24 小时（一天）。
const WECHAT_AFTERSALE_MAX_RANGE_SECONDS = 24 * 60 * 60;

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

/** 单页售后同步结果。 */
export interface SyncWechatAftersalePageResult {
  fetched: number;
  synced: number;
  failed: Array<{ afterSaleCode: string; reason: string }>;
  nextKey: string;
  hasMore: boolean;
}

interface WechatOrderRefundSyncPayload {
  afterSaleCode: string;
  refundAmount?: number;
  refundReason?: string;
  submittedAt?: string;
  refundedAt?: string;
  status: RefundStatus;
}

// 历史订单同步时会额外携带退款时间和退款明细。
interface WechatOrderSyncPayload extends WechatOrderWebhookDto {
  refundedAt?: string;
  refunds?: WechatOrderRefundSyncPayload[];
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
  async upsertWechatOrder(payload: WechatOrderSyncPayload) {
    const existingOrder =
      await this.wechatShopRepository.findLatestByExternalId(payload.orderId);
    let order: Order;
    let action: 'created' | 'updated';

    if (existingOrder) {
      order = await this.wechatShopRepository.update(
        existingOrder.id,
        this.buildUpdateData(payload),
      );
      action = 'updated';
    } else {
      const orderCode = this.generateOrderCode();
      order = await this.wechatShopRepository.create(
        this.buildCreateData(payload, orderCode),
      );
      action = 'created';
    }

    // 订单创建/更新成功后，再把微信退款明细同步到退款表。
    const syncedRefunds = await this.syncWechatOrderRefunds(order, payload);

    return { action, order, syncedRefunds };
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

    for (const range of this.splitWechatAftersaleRanges(startTime, endTime)) {
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

  /**
   * 按时间范围分页拉取微信小店售后单并同步到 order_refunds 表。
   * 使用 splitWechatOrderRanges 按 7 天分片，每片内用 nextKey 分页直到没有更多。
   */
  async syncWechatAftersaleHistory(payload: WechatOrderHistorySyncDto) {
    const startTime = toUnixSeconds(payload.startTime, 'startTime');
    const endTime = toUnixSeconds(payload.endTime, 'endTime');

    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be earlier than endTime');
    }

    const pageSize = payload.pageSize ?? DEFAULT_WECHAT_ORDER_PAGE_SIZE;
    const timeType = payload.timeType ?? 'create';
    let fetched = 0;
    let synced = 0;
    const failed: Array<{ afterSaleCode: string; reason: string }> = [];

    for (const range of splitWechatOrderRanges(startTime, endTime)) {
      let nextKey = '';
      let hasMore = true;

      while (hasMore) {
        const result = await this.syncWechatAftersalePage({
          startTime: range.startTime,
          endTime: range.endTime,
          timeType,
          pageSize,
          nextKey,
        });

        fetched += result.fetched;
        synced += result.synced;
        failed.push(...result.failed);
        nextKey = result.nextKey;
        hasMore = result.hasMore;
      }
    }

    return {
      fetched,
      synced,
      failedCount: failed.length,
      failed,
    };
  }

  /**
   * 同步单页售后单：先拉 ID 列表，再逐条拉详情，最后写入退款记录。
   * 批量拉取的详情后续也会通过 upsert 写入。
   */
  async syncWechatAftersalePage(
    params: SyncWechatOrderPageParams,
  ): Promise<SyncWechatAftersalePageResult> {
    const listResult = await this.wechatShopOrderClient.getAftersaleIds({
      startTime: params.startTime,
      endTime: params.endTime,
      timeType: params.timeType,
      pageSize: params.pageSize,
      nextKey: params.nextKey ?? '',
    });
    const listDetails = this.extractAftersaleDetailsFromList();
    const listIds = this.extractAftersaleIdsFromList(listResult);
    const details = [...listDetails];
    const failed: Array<{ afterSaleCode: string; reason: string }> = [];
    let synced = 0;

    for (const afterSaleCode of listIds) {
      try {
        details.push(
          await this.wechatShopOrderClient.getAftersale(afterSaleCode),
        );
      } catch (error) {
        failed.push({
          afterSaleCode,
          reason: error instanceof Error ? error.message : 'Unknown sync error',
        });
      }
    }

    for (const detail of details) {
      const afterSaleCode =
        this.resolveWechatAfterSaleCode(detail) ?? 'unknown';

      try {
        const result = await this.syncWechatAftersaleRefund(detail);
        if (result) synced += 1;
      } catch (error) {
        failed.push({
          afterSaleCode,
          reason: error instanceof Error ? error.message : 'Unknown sync error',
        });
      }
    }

    const nextKey = listResult.next_key ?? '';

    return {
      fetched: listIds.length + listDetails.length,
      synced,
      failed,
      nextKey,
      hasMore: Boolean(listResult.has_more && nextKey),
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
    payload: WechatOrderSyncPayload,
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
    payload: WechatOrderSyncPayload,
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
  >(data: T, payload: WechatOrderSyncPayload): T {
    if (payload.status) data.status = payload.status;
    if (payload.paidAt) data.paidAt = new Date(payload.paidAt);
    if (payload.refundedAt) data.refundedAt = new Date(payload.refundedAt);
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
  ): WechatOrderSyncPayload {
    const product = order.order_detail?.product_infos?.[0];
    const payInfo = order.order_detail?.pay_info;
    const priceInfo = order.order_detail?.price_info;
    const addressInfo = order.order_detail?.delivery_info?.address_info;
    const orderId = String(order.order_id ?? fallbackOrderId);
    // 优先从 aftersale_detail 提取售后明细，没有时兼容旧的 refund_info。
    const refunds = this.extractWechatRefunds(order, orderId);
    const refundedAt = this.resolveOrderRefundedAt(refunds);

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
      refundedAt,
      refunds,
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
          refundCount: refunds.length,
        },
      },
    };
  }

  private mapWechatShopStatus(
    status: number | undefined,
    order: WechatShopOrder,
  ): OrderStatus | undefined {
    if (this.hasWechatFullRefund(order)) return OrderStatus.REFUNDED;

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
        refundInfo?.refund_status !== undefined,
    );
  }

  private hasWechatFullRefund(order: WechatShopOrder): boolean {
    const refundAmount = this.resolveWechatRefundAmount(order);
    const orderAmount = this.resolveWechatOrderAmount(order);

    // 只有已结算退款金额覆盖订单金额，才把主订单标记为 REFUNDED。
    return Boolean(
      refundAmount !== undefined &&
        orderAmount !== undefined &&
        orderAmount > 0 &&
        refundAmount >= orderAmount,
    );
  }

  private resolveWechatRefundAmount(
    order: WechatShopOrder,
  ): number | undefined {
    const refunds = this.extractWechatRefunds(
      order,
      String(order.order_id ?? 'unknown'),
    );

    if (!refunds.length) return undefined;

    // 订单主状态只统计已结算退款，待处理退款不算全额退款。
    return refunds.reduce(
      (total, refund) =>
        refund.status === RefundStatus.SETTLED
          ? total + (refund.refundAmount ?? 0)
          : total,
      0,
    );
  }

  private extractWechatRefunds(
    order: WechatShopOrder,
    orderId: string,
  ): WechatOrderRefundSyncPayload[] {
    // 微信可能返回单个售后对象，也可能返回售后数组，这里统一成数组处理。
    const details = this.normalizeAftersaleDetails(order.aftersale_detail);
    if (details.length) {
      return details
        .map((detail, index) =>
          this.mapWechatAftersaleDetailToRefund(detail, orderId, index),
        )
        .filter(
          (refund): refund is WechatOrderRefundSyncPayload =>
            refund !== undefined,
        );
    }

    const refundInfo = order.order_detail?.refund_info;
    // 老结构里只有 refund_info，没有售后明细时也要兼容同步。
    if (!this.hasWechatRefund(order) || !refundInfo) return [];

    const refundAmount = refundInfo.refund_amount ?? refundInfo.amount;
    const status = this.mapWechatRefundStatus(refundInfo.refund_status);
    const refundedAt =
      status === RefundStatus.SETTLED
        ? unixSecondsToISOString(
            refundInfo.refund_time ?? refundInfo.refunded_time,
          )
        : undefined;

    return [
      {
        afterSaleCode:
          this.pickString(
            refundInfo.after_sale_code,
            refundInfo.aftersale_code,
            refundInfo.after_sale_id,
            refundInfo.aftersale_id,
            refundInfo.after_sale_order_id,
            refundInfo.refund_id,
          ) ?? `wechat:${orderId}:refund`,
        refundAmount,
        refundReason: refundInfo.refund_reason ?? refundInfo.reason,
        submittedAt: unixSecondsToISOString(
          refundInfo.create_time ?? refundInfo.update_time,
        ),
        refundedAt,
        status,
      },
    ];
  }

  private normalizeAftersaleDetails(
    details: WechatShopOrder['aftersale_detail'],
  ): WechatShopAftersaleDetail[] {
    if (!details) return [];
    if (Array.isArray(details)) return details;

    return [details];
  }

  private mapWechatAftersaleDetailToRefund(
    detail: WechatShopAftersaleDetail,
    orderId: string,
    index: number,
  ): WechatOrderRefundSyncPayload | undefined {
    const refundAmount =
      detail.refund_info?.amount ?? detail.refund_amount ?? detail.amount;
    const afterSaleCode =
      this.pickString(
        detail.after_sale_order_id,
        detail.after_sale_code,
        detail.aftersale_code,
        detail.after_sale_id,
        detail.aftersale_id,
        detail.after_sale_order_id,
        detail.refund_id,
      ) ?? `wechat:${orderId}:refund:${index + 1}`;

    if (
      refundAmount === undefined &&
      detail.refund_status === undefined &&
      detail.status === undefined
    ) {
      return undefined;
    }

    const status = this.mapWechatRefundStatus(
      detail.refund_status ?? detail.status,
    );
    const refundedAt =
      status === RefundStatus.SETTLED
        ? unixSecondsToISOString(
            detail.complete_time ?? detail.refund_time ?? detail.refunded_time,
          )
        : undefined;

    return {
      afterSaleCode,
      refundAmount,
      refundReason:
        detail.reason_text ??
        detail.refund_reason ??
        detail.reason ??
        (detail.refund_info?.refund_reason !== undefined
          ? String(detail.refund_info.refund_reason)
          : undefined),
      submittedAt: unixSecondsToISOString(
        detail.create_time ?? detail.update_time,
      ),
      refundedAt,
      status,
    };
  }

  /**
   * 将单条售后详情转换为退款记录并同步入库，同时刷新关联订单的退款状态。
   */
  private async syncWechatAftersaleRefund(detail: WechatShopAftersaleDetail) {
    const externalOrderId = this.pickString(detail.order_id);
    const order = externalOrderId
      ? await this.wechatShopRepository.findLatestByExternalId(externalOrderId)
      : null;
    const refund = this.mapWechatAftersaleDetailToRefund(
      detail,
      externalOrderId ?? 'unknown',
      0,
    );

    if (!refund) return undefined;

    const syncedRefund = await this.upsertWechatRefund(order?.id, refund);
    if (order) {
      await this.refreshWechatOrderRefundStatus(order, refund.refundedAt);
    }

    return syncedRefund;
  }

  private mapWechatRefundStatus(
    status: string | number | undefined,
  ): RefundStatus {
    // 当前只区分待处理和已结算：微信状态 0 视为待处理。
    if (status === 0) return RefundStatus.PENDING;
    if (typeof status === 'number') return RefundStatus.SETTLED;

    if (typeof status === 'string') {
      const normalizedStatus = status.toUpperCase();
      if (
        normalizedStatus === 'MERCHANT_REFUND_SUCCESS' ||
        normalizedStatus === 'MERCHANT_RETURN_SUCCESS'
      ) {
        return RefundStatus.SETTLED;
      }

      if (
        normalizedStatus.includes('WAIT') ||
        normalizedStatus.includes('PENDING') ||
        normalizedStatus.includes('APPLY') ||
        normalizedStatus.includes('PROCESS') ||
        normalizedStatus.includes('REFUNDING')
      ) {
        return RefundStatus.PENDING;
      }
    }

    return status === undefined ? RefundStatus.SETTLED : RefundStatus.PENDING;
  }

  private resolveOrderRefundedAt(
    refunds: WechatOrderRefundSyncPayload[],
  ): string | undefined {
    return refunds.find((refund) => refund.refundedAt)?.refundedAt;
  }

  private async syncWechatOrderRefunds(
    order: Order,
    payload: WechatOrderSyncPayload,
  ) {
    const refunds = payload.refunds ?? [];
    if (!refunds.length) return [];

    const syncedRefunds = await Promise.all(
      refunds.map((refund) => this.upsertWechatRefund(order.id, refund)),
    );
    await this.refreshWechatOrderRefundStatus(
      order,
      this.resolveOrderRefundedAt(refunds),
    );

    return syncedRefunds;
  }

  private upsertWechatRefund(
    orderId: string | undefined,
    refund: WechatOrderRefundSyncPayload,
  ) {
    // afterSaleCode 是退款表唯一键，重复同步时更新同一条退款记录。
    return this.wechatShopRepository.upsertRefund(
      refund.afterSaleCode,
      {
        afterSaleCode: refund.afterSaleCode,
        orderId,
        refundChannel: RefundChannel.WECHAT,
        refundAmount: refund.refundAmount,
        refundReason: refund.refundReason,
        status: refund.status,
        submittedAt: refund.submittedAt
          ? new Date(refund.submittedAt)
          : undefined,
        refundedAt: refund.refundedAt ? new Date(refund.refundedAt) : undefined,
      },
      {
        orderId,
        refundChannel: RefundChannel.WECHAT,
        refundAmount: refund.refundAmount,
        refundReason: refund.refundReason,
        status: refund.status,
        submittedAt: refund.submittedAt
          ? new Date(refund.submittedAt)
          : undefined,
        refundedAt: refund.refundedAt ? new Date(refund.refundedAt) : undefined,
      },
    );
  }

  /**
   * 刷新订单退款状态：当所有已结算退款金额 >= 订单金额时，标记订单为已退款。
   */
  private async refreshWechatOrderRefundStatus(
    order: Order,
    refundedAt?: string,
  ) {
    const settledRefundAmount =
      await this.wechatShopRepository.sumSettledRefundAmountByOrderId(order.id);

    if (order.amount > 0 && settledRefundAmount >= order.amount) {
      await this.wechatShopRepository.update(order.id, {
        status: OrderStatus.REFUNDED,
        refundedAt: refundedAt ? new Date(refundedAt) : new Date(),
      });
    }
  }

  /**
   * 从售后列表响应中提取售后单 ID 数组。
   */
  private extractAftersaleIdsFromList(
    result: WechatShopAftersaleListResponse,
  ): string[] {
    return (result.after_sale_order_id_list ?? []).map(String);
  }

  /**
   * 从售后列表响应中提取内嵌的售后详情。
   * 当前微信 getaftersalelist 接口不返回详情字段，后续接口扩展后可在此补充提取逻辑。
   */
  private extractAftersaleDetailsFromList(): WechatShopAftersaleDetail[] {
    return [];
  }

  /**
   * 从售后详情中解析售后编号，兼容微信不同接口返回的多种字段名。
   */
  private resolveWechatAfterSaleCode(
    detail: WechatShopAftersaleDetail,
  ): string | undefined {
    return this.pickString(
      detail.after_sale_order_id,
      detail.after_sale_code,
      detail.aftersale_code,
      detail.after_sale_id,
      detail.aftersale_id,
      detail.after_sale_order_id,
      detail.refund_id,
    );
  }

  /**
   * 将时间范围按 WECHAT_AFTERSALE_MAX_RANGE_SECONDS 切片，兼容微信售后接口 24 小时上限。
   */
  private splitWechatAftersaleRanges(startTime: number, endTime: number) {
    const ranges: Array<{ startTime: number; endTime: number }> = [];
    let cursor = startTime;

    while (cursor < endTime) {
      const rangeEnd = Math.min(
        cursor + WECHAT_AFTERSALE_MAX_RANGE_SECONDS,
        endTime,
      );
      ranges.push({ startTime: cursor, endTime: rangeEnd });
      cursor = rangeEnd;
    }

    return ranges;
  }

  private pickString(
    ...values: Array<string | number | null | undefined>
  ): string | undefined {
    // 微信不同接口字段名不完全一致，按优先级取第一个有效编号。
    for (const value of values) {
      if (value === null || value === undefined) continue;

      const stringValue = String(value).trim();
      if (stringValue) return stringValue;
    }

    return undefined;
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
