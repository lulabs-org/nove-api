import { OrderStatus } from '@/generated/prisma/client';
import {
  calculateEffectiveUsedDays,
  calculateSuggestedRefundAmount,
} from './benefit-calculation.util';

describe('benefit-calculation.util', () => {
  describe('calculateEffectiveUsedDays', () => {
    it('returns natural days when no freeze has occurred', () => {
      const benefitStart = new Date('2024-01-01T00:00:00.000Z');
      // 200 days later: 2024-07-19
      const applyAt = new Date('2024-07-19T00:00:00.000Z');

      const usedDays = calculateEffectiveUsedDays({
        benefitStart,
        applyAt,
        frozenDays: 0,
        status: OrderStatus.PAID,
      });

      expect(usedDays).toBe(200);
    });

    it('subtracts historical frozen days (e.g. 36 days) from total natural days', () => {
      const benefitStart = new Date('2024-01-01T00:00:00.000Z');
      const applyAt = new Date('2024-07-19T00:00:00.000Z'); // 200 natural days

      const usedDays = calculateEffectiveUsedDays({
        benefitStart,
        applyAt,
        frozenDays: 36, // previously frozen for 36 days
        status: OrderStatus.PAID,
      });

      // 200 - 36 = 164 days!
      expect(usedDays).toBe(164);
    });

    it('dynamically calculates and subtracts current freeze period when order is currently FROZEN', () => {
      const benefitStart = new Date('2024-01-01T00:00:00.000Z');
      // Frozen started on 2024-05-01 (day 121)
      const frozenAt = new Date('2024-05-01T00:00:00.000Z');
      // Refund applied 10 days into the freeze: 2024-05-11 (day 131)
      const applyAt = new Date('2024-05-11T00:00:00.000Z');

      const usedDays = calculateEffectiveUsedDays({
        benefitStart,
        applyAt,
        frozenDays: 0,
        frozenAt,
        status: OrderStatus.FROZEN,
      });

      // Total natural days: 131. Current freeze duration: 10 days. Effective used: 131 - 10 = 121 days!
      expect(usedDays).toBe(121);
    });

    it('handles refund applied before benefit starts or missing benefitStart', () => {
      expect(
        calculateEffectiveUsedDays({
          benefitStart: null,
        }),
      ).toBe(0);

      const benefitStart = new Date('2024-02-01T00:00:00.000Z');
      const applyAt = new Date('2024-01-15T00:00:00.000Z');

      expect(
        calculateEffectiveUsedDays({
          benefitStart,
          applyAt,
        }),
      ).toBe(0);
    });
  });

  describe('calculateSuggestedRefundAmount', () => {
    it('calculates proportional refund for remaining days', () => {
      // Order amount: 36500 cents ($365.00), total days: 365, used: 164 days
      const amount = calculateSuggestedRefundAmount({
        orderAmount: 36500,
        totalDays: 365,
        usedDays: 164,
      });

      // Remaining days: 201. Refund: 36500 * (201 / 365) = 20100 cents
      expect(amount).toBe(20100);
    });

    it('returns 0 when used days exceed or equal total days', () => {
      expect(
        calculateSuggestedRefundAmount({
          orderAmount: 10000,
          totalDays: 365,
          usedDays: 365,
        }),
      ).toBe(0);

      expect(
        calculateSuggestedRefundAmount({
          orderAmount: 10000,
          totalDays: 365,
          usedDays: 400,
        }),
      ).toBe(0);
    });
  });
});
