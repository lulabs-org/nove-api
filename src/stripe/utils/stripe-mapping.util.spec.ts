import { Currency, OrderStatus, RefundStatus } from '@prisma/client';
import {
  mapAmount,
  mapCurrency,
  mapPaymentStatus,
  mapRefundStatus,
  parseStripeTimestamp,
} from './stripe-mapping.util';

describe('stripe-mapping.util', () => {
  describe('mapCurrency', () => {
    it('should map valid currencies to uppercase Currency enum', () => {
      expect(mapCurrency('usd')).toBe(Currency.USD);
      expect(mapCurrency('cny')).toBe(Currency.CNY);
      expect(mapCurrency('eur')).toBe(Currency.EUR);
      expect(mapCurrency('jpy')).toBe(Currency.JPY);
      expect(mapCurrency('gbp')).toBe(Currency.GBP);
    });

    it('should default to USD for unsupported or missing currency', () => {
      expect(mapCurrency(undefined)).toBe(Currency.USD);
      expect(mapCurrency(null)).toBe(Currency.USD);
      expect(mapCurrency('xyz')).toBe(Currency.USD);
    });
  });

  describe('mapPaymentStatus', () => {
    it('should map succeeded/paid/complete to OrderStatus.PAID', () => {
      expect(mapPaymentStatus('succeeded')).toBe(OrderStatus.PAID);
      expect(mapPaymentStatus('paid')).toBe(OrderStatus.PAID);
      expect(mapPaymentStatus('complete')).toBe(OrderStatus.PAID);
    });

    it('should map canceled/cancelled to OrderStatus.CANCELLED', () => {
      expect(mapPaymentStatus('canceled')).toBe(OrderStatus.CANCELLED);
      expect(mapPaymentStatus('cancelled')).toBe(OrderStatus.CANCELLED);
    });

    it('should map other states to OrderStatus.UNPAID', () => {
      expect(mapPaymentStatus('processing')).toBe(OrderStatus.UNPAID);
      expect(mapPaymentStatus('requires_payment_method')).toBe(OrderStatus.UNPAID);
      expect(mapPaymentStatus(undefined)).toBe(OrderStatus.UNPAID);
    });
  });

  describe('mapRefundStatus', () => {
    it('should map succeeded to RefundStatus.SETTLED', () => {
      expect(mapRefundStatus('succeeded')).toBe(RefundStatus.SETTLED);
    });

    it('should map other statuses to RefundStatus.PENDING', () => {
      expect(mapRefundStatus('pending')).toBe(RefundStatus.PENDING);
      expect(mapRefundStatus('requires_action')).toBe(RefundStatus.PENDING);
      expect(mapRefundStatus('failed')).toBe(RefundStatus.PENDING);
      expect(mapRefundStatus(undefined)).toBe(RefundStatus.PENDING);
    });
  });

  describe('parseStripeTimestamp', () => {
    it('should parse unix seconds number', () => {
      const ts = 1700000000;
      const date = parseStripeTimestamp(ts);
      expect(date).toBeInstanceOf(Date);
      expect(date?.getTime()).toBe(ts * 1000);
    });

    it('should parse ISO string', () => {
      const str = '2026-09-12T00:00:00.000Z';
      const date = parseStripeTimestamp(str);
      expect(date).toBeInstanceOf(Date);
      expect(date?.toISOString()).toBe(str);
    });

    it('should return undefined for empty/invalid timestamp', () => {
      expect(parseStripeTimestamp(null)).toBeUndefined();
      expect(parseStripeTimestamp('')).toBeUndefined();
      expect(parseStripeTimestamp('invalid-date')).toBeUndefined();
    });
  });
});
