import { Currency, OrderStatus, RefundStatus } from '@/generated/prisma/client';

const SUPPORTED_CURRENCIES = new Set<string>([
  'CNY',
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'HKD',
  'TWD',
  'SGD',
  'AUD',
  'CAD',
]);

/**
 * 将 Stripe 货币代码转换为本地 Currency 枚举
 */
export function mapCurrency(currencyStr?: string | null): Currency {
  if (!currencyStr) return Currency.USD;
  const upper = currencyStr.trim().toUpperCase();
  if (SUPPORTED_CURRENCIES.has(upper)) {
    return upper as Currency;
  }
  return Currency.USD;
}

/**
 * 映射 Stripe 支付状态到本地 OrderStatus
 */
export function mapPaymentStatus(status?: string | null): OrderStatus {
  switch (status?.toLowerCase()) {
    case 'succeeded':
    case 'paid':
    case 'complete':
      return OrderStatus.PAID;
    case 'canceled':
    case 'cancelled':
      return OrderStatus.CANCELLED;
    case 'requires_payment_method':
    case 'requires_confirmation':
    case 'requires_action':
    case 'processing':
    case 'unpaid':
    default:
      return OrderStatus.UNPAID;
  }
}

/**
 * 映射 Stripe 退款状态到本地 RefundStatus
 */
export function mapRefundStatus(status?: string | null): RefundStatus {
  switch (status?.toLowerCase()) {
    case 'succeeded':
      return RefundStatus.SETTLED;
    case 'pending':
    case 'requires_action':
    case 'failed':
    case 'canceled':
    default:
      return RefundStatus.PENDING;
  }
}

/**
 * 解析 ISO 字符串或秒级时间戳为 Date 对象
 */
export function parseStripeTimestamp(
  value?: string | number | null,
): Date | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') {
    return new Date(value * 1000);
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}
