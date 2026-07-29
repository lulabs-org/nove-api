import { Injectable, Logger } from '@nestjs/common';
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
    (payload: any) => Promise<void>
  > = {
      channels_ec_order_pay: (payload) => this.handleOrderPay(payload),
      channels_ec_aftersale_update: (payload) =>
        this.handleAftersaleUpdate(payload),
    };

  constructor(
    private readonly wechatShopOrderService: WechatShopOrderService,
  ) { }

  /**
   * 处理微信小店 Webhook 事件
   */
  async handleWechatEvent(eventData: Record<string, unknown>) {
    try {
      const eventType = String(eventData.Event);
      const handler = this.eventHandlers[eventType];

      if (handler) {
        await handler(eventData);
      } else {
        this.logger.debug(`Ignored WeChat event type: ${eventType}`);
      }
    } catch (err) {
      // 记录错误但不抛出异常，为了能够向微信返回 success，避免微信持续重试
      this.logger.error(
        `Failed to process WeChat event [${String(eventData.Event)}]:`,
        err,
      );
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
    const orderId = payload.finder_shop_aftersale_status_update?.order_id;
    if (orderId) {
      // TODO: 处理售后状态更新
    }
  }
}
