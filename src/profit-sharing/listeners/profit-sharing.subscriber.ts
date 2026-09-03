import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ProfitSharingService } from '../services/profit-sharing.service';
import {
  OrderFinancialClosedEventPayload,
  OrderRefundedEventPayload,
} from '../types';

@Injectable()
export class ProfitSharingSubscriber {
  private readonly logger = new Logger(ProfitSharingSubscriber.name);

  constructor(private readonly profitSharingService: ProfitSharingService) {}

  /**
   * 监听订单核算完成事件
   * 假设事件 paylaod 为 { orderId: string }
   */
  @OnEvent('order.financial_closed', { async: true })
  async handleOrderFinancialClosedEvent(
    payload: OrderFinancialClosedEventPayload,
  ) {
    this.logger.log(
      `Received order.financial_closed event for order ${payload.orderId}`,
    );
    try {
      await this.profitSharingService.calculateProfitShare(payload.orderId);
    } catch (error) {
      this.logger.error(
        `Error calculating profit share for order ${payload.orderId}`,
        error,
      );
    }
  }

  /**
   * 监听订单退款事件
   * 假设事件 payload 为 { orderId: string, refundAmount: number }
   */
  @OnEvent('order.refunded', { async: true })
  async handleOrderRefundedEvent(payload: OrderRefundedEventPayload) {
    this.logger.log(
      `Received order.refunded event for order ${payload.orderId}, refundAmount: ${payload.refundAmount}`,
    );
    try {
      await this.profitSharingService.handleRefundClawback(
        payload.orderId,
        payload.refundAmount,
        payload.settledAt,
      );
    } catch (error) {
      this.logger.error(
        `Error handling refund clawback for order ${payload.orderId}`,
        error,
      );
    }
  }
}
