import { OrderStatus } from '@/generated/prisma/client';

export interface BenefitUsedDaysOptions {
  benefitStart?: Date | string | null;
  frozenDays?: number | null;
  frozenAt?: Date | string | null;
  status?: OrderStatus | null;
  applyAt?: Date | string | null;
}

export interface SuggestedRefundOptions {
  orderAmount: number; // 订单总金额（分）
  totalDays: number; // 购买的总有效天数（例如 365）
  usedDays: number; // 实际已消耗天数
}

export interface BenefitCalculationPreview {
  benefitStart: Date | null;
  applyAt: Date;
  naturalDays: number;
  totalFrozenDays: number;
  isCurrentlyFrozen: boolean;
  effectiveUsedDays: number;
  remainingDays: number;
  suggestedRefundAmount: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 精确计算订单实际已消耗的权益天数（剔除历史冻结与当前进行中的冻结天数）
 */
export function calculateEffectiveUsedDays(
  options: BenefitUsedDaysOptions,
): number {
  if (!options.benefitStart) {
    return 0;
  }

  const startDate =
    options.benefitStart instanceof Date
      ? options.benefitStart
      : new Date(options.benefitStart);

  const applyDate = options.applyAt
    ? options.applyAt instanceof Date
      ? options.applyAt
      : new Date(options.applyAt)
    : new Date();

  // 如果申请退款时间早于权益开始时间，实际使用天数为 0
  if (applyDate.getTime() <= startDate.getTime()) {
    return 0;
  }

  // 1. 自然日跨度（向上取整，例如当天用了就算 1 天）
  const naturalDays = Math.max(
    0,
    Math.ceil((applyDate.getTime() - startDate.getTime()) / MS_PER_DAY),
  );

  // 2. 累计已完成的历史冻结天数
  let totalFrozenDays = Math.max(0, options.frozenDays || 0);

  // 3. 如果申请退款时订单正处于冻结中（FROZEN），动态计算当前这期冻结天数（截止到申请日）
  const isCurrentlyFrozen = options.status === OrderStatus.FROZEN;

  if (isCurrentlyFrozen && options.frozenAt) {
    const frozenAtDate =
      options.frozenAt instanceof Date
        ? options.frozenAt
        : new Date(options.frozenAt);

    if (applyDate.getTime() > frozenAtDate.getTime()) {
      const currentFreezeDays = Math.ceil(
        (applyDate.getTime() - frozenAtDate.getTime()) / MS_PER_DAY,
      );
      totalFrozenDays += currentFreezeDays;
    }
  }

  // 4. 实际有效使用天数 = 自然日天数 - 冻结天数（最低为 0，不能为负数）
  return Math.max(0, naturalDays - totalFrozenDays);
}

/**
 * 建议退款金额计算公式：订单实付金额 * (剩余可用天数 / 购买总天数)
 */
export function calculateSuggestedRefundAmount(
  options: SuggestedRefundOptions,
): number {
  if (options.orderAmount <= 0 || options.totalDays <= 0) {
    return 0;
  }

  const effectiveUsed = Math.max(0, options.usedDays);
  const remainingDays = Math.max(0, options.totalDays - effectiveUsed);

  if (remainingDays <= 0) {
    return 0;
  }

  // 四舍五入保留到整数分
  return Math.min(
    options.orderAmount,
    Math.round((options.orderAmount * remainingDays) / options.totalDays),
  );
}
