import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WechatShopOrderService } from './wechat-shop-order.service';
import {
  ChannelsEcOrderPayEvent,
  ChannelsEcAftersaleUpdateEvent,
} from '../types/wechat-shop-event.types';

@Injectable()
export class WechatShopEventService {
  private readonly logger = new Logger(WechatShopEventService.name);

  // 事件处理路由表，新增事件时只需在此处注册并添加对应的处理方法
  private readonly eventHandlers: Record<
    string,
    (payload: unknown) => Promise<void>
  > = {
    channels_ec_order_pay: (payload) =>
      this.handleOrderPay(payload as ChannelsEcOrderPayEvent),
    channels_ec_aftersale_update: (payload) =>
      this.handleAftersaleUpdate(payload as ChannelsEcAftersaleUpdateEvent),
  };

  constructor(
    private readonly wechatShopOrderService: WechatShopOrderService,
    @InjectQueue('wechat-order-sync') private readonly syncQueue: Queue,
  ) {}

  /**
   * 处理微信小店 Webhook 事件
   */
  async handleWechatEvent(eventData: Record<string, unknown>) {
    const eventType = String(eventData.Event);
    const handler = this.eventHandlers[eventType];

    if (handler) {
      await handler(eventData);
    } else {
      this.logger.debug(`Ignored WeChat event type: ${eventType}`);
    }
  }

  /**
   * 处理订单支付成功事件
   */
  private async handleOrderPay(payload: ChannelsEcOrderPayEvent) {
    const orderId = payload.order_info?.order_id;
    if (orderId) {
      await this.wechatShopOrderService.syncSingle(String(orderId));
    }
  }

  /**
   * 处理售后状态更新事件
   */
  private async handleAftersaleUpdate(payload: ChannelsEcAftersaleUpdateEvent) {
    const afterSaleOrderId =
      payload.finder_shop_aftersale_status_update?.after_sale_order_id;

    if (!afterSaleOrderId) {
      throw new Error('Missing after_sale_order_id in WeChat aftersale event');
    }

    // 回调只负责可靠入队，详情查询和数据库写入交给 Worker 重试处理。
    await this.syncQueue.add(
      'sync-single-aftersale',
      { afterSaleOrderId: String(afterSaleOrderId) },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }
}
