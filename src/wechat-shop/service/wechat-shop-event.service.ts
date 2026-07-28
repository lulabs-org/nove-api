import { Injectable, Logger } from '@nestjs/common';
import { WechatShopService } from './wechat-shop.service';
import { ChannelsEcOrderPayEvent, ChannelsEcAftersaleUpdateEvent } from '../types/wechat-shop-event.types';

@Injectable()
export class WechatShopEventService {
  private readonly logger = new Logger(WechatShopEventService.name);

  constructor(private readonly wechatShopService: WechatShopService) { }

  /**
   * 处理微信小店 Webhook 事件
   */
  async handleWechatEvent(eventData: Record<string, unknown>) {
    try {
      const eventType = eventData.Event;

      if (eventType === 'channels_ec_order_pay') {
        const payload = eventData as unknown as ChannelsEcOrderPayEvent;
        const orderId = payload.order_info?.order_id;

        if (orderId) {
          await this.wechatShopService.syncSingleOrder(String(orderId));
        }
      } else if (eventType === 'channels_ec_aftersale_update') {
        const payload = eventData as unknown as ChannelsEcAftersaleUpdateEvent;
        const orderId = payload.finder_shop_aftersale_status_update?.order_id;
        
        if (orderId) {
          await this.wechatShopService.syncSingleOrder(String(orderId));
        }
      }
    } catch (err) {
      // 记录错误但不抛出异常，为了能够向微信返回 success，避免微信持续重试
      this.logger.error(`Failed to process WeChat event [${eventData.Event}]:`, err);
    }
  }
}
