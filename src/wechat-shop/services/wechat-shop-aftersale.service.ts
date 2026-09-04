import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RefundChannel, RefundStatus } from '@prisma/client';
import { WechatShopRepository } from '../repositories';
import {
  GetAftersaleListParams,
  GetAftersaleListResponse,
  WechatShopAftersaleOrder,
} from '../types';
import { WechatShopClientService } from './wechat-shop-client.service';
import {
  WechatAftersaleHistorySyncDto,
  WechatAftersaleListQueryDto,
} from '../dto';
import {
  MAX_AFTERSALE_TIME_RANGE_SECONDS,
  splitTimeRanges,
  WechatOrderUnixRange,
} from '../utils/wechat-order-sync.util';

const SETTLED_AFTERSALE_STATUSES = new Set([
  'MERCHANT_REFUND_SUCCESS',
  'MERCHANT_RETURN_SUCCESS',
]);

@Injectable()
export class WechatShopAftersaleService {
  private readonly logger = new Logger(WechatShopAftersaleService.name);

  constructor(
    private readonly wechatShopClient: WechatShopClientService,
    private readonly wechatShopRepository: WechatShopRepository,
    @InjectQueue('wechat-order-sync') private readonly orderQueue: Queue,
  ) {}

  /**
   * 以微信售后详情接口的结果为准，幂等同步一张售后单。
   */
  async syncSingle(afterSaleOrderId: string) {
    //获取完整的售后信息
    const response =
      await this.wechatShopClient.getAftersaleOrder(afterSaleOrderId);
    const aftersaleOrder = response.after_sale_order!;
    // 根据售后单的订单ID，查询本地订单
    const order = await this.wechatShopRepository.findLatestByExternalId(
      String(aftersaleOrder.order_id),
    );

    if (!order) {
      this.logger.warn(
        `Local order not found for WeChat aftersale: ` +
          `afterSaleOrderId=${afterSaleOrderId}, orderId=${aftersaleOrder.order_id}`,
      );
    }

    const refundData = this.mapRefundData(aftersaleOrder, order?.id);
    // 写入数据库
    return this.wechatShopRepository.upsertRefund({
      afterSaleCode: String(aftersaleOrder.after_sale_order_id),
      create: refundData,
      update: refundData,
    });
  }

  /**
   * 本地退款表目前只有 PENDING/SETTLED 两态：
   * 微信退款成功、退货退款成功映射为 SETTLED，其余状态暂归为 PENDING。
   */
  private mapRefundData(
    aftersaleOrder: WechatShopAftersaleOrder,
    localOrderId?: string,
  ) {
    const settled = SETTLED_AFTERSALE_STATUSES.has(aftersaleOrder.status);
    const completedAt = aftersaleOrder.complete_time
      ? new Date(aftersaleOrder.complete_time * 1000)
      : settled && aftersaleOrder.update_time
        ? new Date(aftersaleOrder.update_time * 1000)
        : undefined;

    return {
      afterSaleCode: String(aftersaleOrder.after_sale_order_id),
      orderId: localOrderId,
      refundChannel: RefundChannel.WECHAT,
      refundAmount: aftersaleOrder.refund_info?.amount,
      refundReason: aftersaleOrder.reason_text ?? aftersaleOrder.reason,
      status: settled ? RefundStatus.SETTLED : RefundStatus.PENDING,
      submittedAt: aftersaleOrder.create_time
        ? new Date(aftersaleOrder.create_time * 1000)
        : undefined,
      refundedAt: completedAt,
    };
  }

  /**
   * 接收历史售后单同步请求，支持最大 1 年时间跨度。
   * 为防止接口超时，按 24 小时切片分发到 BullMQ 异步处理。
   */
  async syncHistory(payload: WechatAftersaleHistorySyncDto) {
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

    const jobs = splitTimeRanges(
      startTime,
      endTime,
      MAX_AFTERSALE_TIME_RANGE_SECONDS,
    ).map((range) => ({
      name: 'sync-aftersale-history-range',
      data: { range, timeRangeKey },
    }));

    await this.orderQueue.addBulk(jobs);

    return { enqueuedRangeTasks: jobs.length };
  }

  /**
   * 后台异步处理单个时间片（最大 24 小时）的售后单拉取并分发单单同步任务
   */
  async processHistoryRange(data: {
    range: WechatOrderUnixRange;
    timeRangeKey: 'create_time_range' | 'update_time_range';
  }) {
    const { range, timeRangeKey } = data;

    let nextKey: string | undefined;
    let hasMore = true;
    let enqueued = 0;

    const isUpdate = timeRangeKey === 'update_time_range';

    while (hasMore) {
      const response = await this.wechatShopClient.getAftersaleList({
        ...(isUpdate
          ? {
              begin_update_time: range.startTime,
              end_update_time: range.endTime,
            }
          : {
              begin_create_time: range.startTime,
              end_create_time: range.endTime,
            }),
        next_key: nextKey,
      });

      const orderIdList = response.after_sale_order_id_list ?? [];
      if (orderIdList.length > 0) {
        const jobs = orderIdList.map((id) => ({
          name: 'sync-single-aftersale',
          data: { afterSaleOrderId: String(id) },
        }));
        await this.orderQueue.addBulk(jobs);
        enqueued += orderIdList.length;
      }

      nextKey = response.next_key;
      hasMore = Boolean(response.has_more && nextKey);
    }

    return { enqueued };
  }

  /**
   * 批量直接查询售后单列表（单次时间跨度不超过 24 小时）
   */
  async getAftersaleList(
    query: WechatAftersaleListQueryDto,
  ): Promise<GetAftersaleListResponse> {
    let beginCreate = query.begin_create_time;
    let endCreate = query.end_create_time;
    let beginUpdate = query.begin_update_time;
    let endUpdate = query.end_update_time;

    if (query.create_time_range) {
      beginCreate = Math.floor(
        new Date(query.create_time_range.start_time).getTime() / 1000,
      );
      endCreate = Math.floor(
        new Date(query.create_time_range.end_time).getTime() / 1000,
      );
    }

    if (query.update_time_range) {
      beginUpdate = Math.floor(
        new Date(query.update_time_range.start_time).getTime() / 1000,
      );
      endUpdate = Math.floor(
        new Date(query.update_time_range.end_time).getTime() / 1000,
      );
    }

    const hasCreate = beginCreate !== undefined && endCreate !== undefined;
    const hasUpdate = beginUpdate !== undefined && endUpdate !== undefined;

    if (!hasCreate && !hasUpdate) {
      throw new BadRequestException(
        'Either create time range or update time range must be provided',
      );
    }

    if (hasCreate && hasUpdate) {
      throw new BadRequestException(
        'create time range and update time range cannot be provided at the same time',
      );
    }

    const startTime = hasCreate ? beginCreate! : beginUpdate!;
    const endTime = hasCreate ? endCreate! : endUpdate!;

    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be earlier than endTime');
    }

    if (endTime - startTime > MAX_AFTERSALE_TIME_RANGE_SECONDS) {
      throw new BadRequestException(
        'Time range cannot exceed 24 hours (86400 seconds)',
      );
    }

    const params: GetAftersaleListParams = {
      ...(hasCreate
        ? { begin_create_time: beginCreate, end_create_time: endCreate }
        : { begin_update_time: beginUpdate, end_update_time: endUpdate }),
      next_key: query.next_key,
    };

    return this.wechatShopClient.getAftersaleList(params);
  }
}
