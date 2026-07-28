import { PaymentProvider, OrderStatus } from '@prisma/client';
import { WechatOrderWebhookDto } from '../dto/wechat-order-webhook.dto';
import { WechatShopOrder } from '../types/wechat-shop.types';
import { unixSecondsToISOString } from './wechat-order-sync.util';

export function toWebhookDto(order: WechatShopOrder): WechatOrderWebhookDto {
  const product = order.order_detail?.product_infos?.[0];
  const payInfo = order.order_detail?.pay_info;
  const priceInfo = order.order_detail?.price_info;
  const addressInfo = order.order_detail?.delivery_info?.address_info;
  const orderId = String(order.order_id);

  return {
    orderId,
    status: mapWechatShopStatus(order.status),
    externalCreatedAt: unixSecondsToISOString(order.create_time),
    externalUpdatedAt: unixSecondsToISOString(order.update_time),
    paidAt: unixSecondsToISOString(payInfo?.pay_time),
    amount: priceInfo?.order_price,
    paymentProvider: payInfo?.transaction_id
      ? PaymentProvider.WECHAT
      : undefined,
    providerTradeNo: payInfo?.transaction_id,
    productName: product?.title,
    phone: addressInfo?.tel_number,
    metadata: {
      source: 'wechat_shop_history_sync',
      openid: order.openid,
      unionid: order.unionid,
    },
  };
}

export function mapWechatShopStatus(
  status: number | undefined,
): OrderStatus | undefined {
  switch (status) {
    case 10:
    case 12:
    case 13:
      return OrderStatus.UNPAID;
    case 17:
    case 20:
    case 21:
    case 30:
      return OrderStatus.PAID;
    case 100:
      return OrderStatus.COMPLETED;
    case 200:
    case 250:
      return OrderStatus.CANCELLED;
    default:
      return undefined;
  }
}
