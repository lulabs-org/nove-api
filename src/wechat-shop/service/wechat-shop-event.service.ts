import { Injectable, Logger } from '@nestjs/common';
import { WechatShopService } from './wechat-shop.service';

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
        const orderInfo = eventData.order_info as Record<string, unknown>;
        const orderId = String(orderInfo?.order_id ?? '');
        if (orderId) {
          await this.wechatShopService.syncSingleOrder(orderId);
        }
      } else if (eventType === 'channels_ec_aftersale_update') {
        const aftersaleInfo = eventData.finder_shop_aftersale_status_update as Record<string, unknown>;
        const orderId = String(aftersaleInfo?.order_id ?? '');
        if (orderId) {
          await this.wechatShopService.syncSingleOrder(orderId);
        }
      }
    } catch (err) {
      // 记录错误但不抛出异常，为了能够向微信返回 success，避免微信持续重试
      this.logger.error(`Failed to process WeChat event [${eventData.Event}]:`, err);
    }
  }
}
