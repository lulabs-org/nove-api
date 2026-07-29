import { Injectable, Logger } from '@nestjs/common';
import { RefundChannel, RefundStatus } from '@prisma/client';
import { WechatShopRepository } from '../repositories';
import { WechatShopAftersaleOrder } from '../types/wechat-shop.types';
import { WechatShopClientService } from './wechat-shop-client.service';

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
  ) {}

  /**
   * 以微信售后详情接口的结果为准，幂等同步一张售后单。
   */
  async syncSingle(afterSaleOrderId: string) {
    const response =
      await this.wechatShopClient.getAftersaleOrder(afterSaleOrderId);
    const aftersaleOrder = response.after_sale_order!;
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
}
