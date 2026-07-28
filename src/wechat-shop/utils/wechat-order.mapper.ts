import { Currency, OrderStatus, PaymentProvider, Prisma } from '@prisma/client';
import { WechatOrderWebhookDto } from '../dto/wechat-order-webhook.dto';
import { WechatShopOrder } from '../types/wechat-shop.types';
import { unixSecondsToISOString } from './wechat-order-sync.util';
import { encodeOrderNumber } from './order-number.util';

/**
 * 创建订单时补齐系统生成的订单号、默认币种和必填金额。
 */
export function buildCreateData(
  payload: WechatOrderWebhookDto,
  orderCode: string,
): Prisma.OrderUncheckedCreateInput {
  return assignOptionalFields(
    {
      orderCode,
      orderNumber: encodeOrderNumber(orderCode),
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
export function buildUpdateData(
  payload: WechatOrderWebhookDto,
): Prisma.OrderUncheckedUpdateInput {
  return assignOptionalFields(
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
export function assignOptionalFields<
  T extends Prisma.OrderUncheckedCreateInput | Prisma.OrderUncheckedUpdateInput,
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

export function mapWechatShopOrderToWebhookPayload(
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
    status: mapWechatShopStatus(order.status, order),
    externalCreatedAt: unixSecondsToISOString(order.create_time),
    externalUpdatedAt: unixSecondsToISOString(order.update_time),
    paidAt: unixSecondsToISOString(payInfo?.pay_time),
    amount: resolveWechatOrderAmount(order),
    paymentProvider: payInfo?.transaction_id
      ? PaymentProvider.WECHAT
      : undefined,
    providerTradeNo: payInfo?.transaction_id,
    productName: product?.title,
    phone: addressInfo?.tel_number,
    metadata: {
      source: 'wechat_shop_history_sync',
      rawOrder: order as any,
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

export function mapWechatShopStatus(
  status: number | undefined,
  order: WechatShopOrder,
): OrderStatus | undefined {
  if (hasWechatRefund(order)) return OrderStatus.REFUNDED;

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

export function hasWechatRefund(order: WechatShopOrder): boolean {
  const refundInfo = order.order_detail?.refund_info;

  return Boolean(
    refundInfo?.amount ||
      refundInfo?.refund_amount ||
      refundInfo?.refund_status,
  );
}

export function resolveWechatOrderAmount(
  order: WechatShopOrder,
): number | undefined {
  const orderPrice = order.order_detail?.price_info?.order_price;
  if (typeof orderPrice === 'number') return orderPrice;

  return order.order_detail?.product_infos?.reduce((total, product) => {
    const price = product.real_price ?? product.sale_price ?? 0;
    const count = product.sku_cnt ?? 1;

    return total + price * count;
  }, 0);
}
