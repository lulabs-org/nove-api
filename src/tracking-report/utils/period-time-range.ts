import { TrackingCadence } from '@prisma/client';

/**
 * 周期上下文配置接口定义
 * @property sourceCadence 数据源的周期类型，如汇总 DAILY 数据时，数据源为 RECORDING（录音）
 * @property label 当前周期的中文展示标签（如：本日、本周、本月等）
 */
export interface PeriodContext {
  sourceCadence: TrackingCadence | 'RECORDING';
  label: string;
}

/**
 * 各个跟踪周期的上下文配置映射
 * 定义了不同周期类型对应的数据源周期类型和中文标签
 * - DAILY: 基于录音 (RECORDING) 数据汇总
 * - WEEKLY / MONTHLY: 基于每日 (DAILY) 数据汇总
 * - QUARTERLY / YEARLY: 基于每月 (MONTHLY) 数据汇总
 */
const CONTEXT: Partial<Record<TrackingCadence, PeriodContext>> = {
  [TrackingCadence.DAILY]: {
    sourceCadence: 'RECORDING',
    label: '本日'
  },
  [TrackingCadence.WEEKLY]: {
    sourceCadence: TrackingCadence.DAILY,
    label: '本周',
  },
  [TrackingCadence.MONTHLY]: {
    sourceCadence: TrackingCadence.DAILY,
    label: '本月',
  },
  [TrackingCadence.QUARTERLY]: {
    sourceCadence: TrackingCadence.MONTHLY,
    label: '本季度',
  },
  [TrackingCadence.YEARLY]: {
    sourceCadence: TrackingCadence.MONTHLY,
    label: '本年',
  },
};

/**
 * 获取指定跟踪周期的上下文配置
 * @param cadence 跟踪周期类型
 * @returns 周期上下文配置信息（包含数据源周期类型和展示标签）
 */
export const getPeriodContext = (cadence: TrackingCadence) => CONTEXT[cadence];

/**
 * 根据周期类型和目标日期，计算该周期的起始和结束时间范围
 * (时间范围精确到毫秒，如：00:00:00.000 到 23:59:59.999)
 *
 * @param cadence 跟踪周期类型 (YEARLY, QUARTERLY, MONTHLY, WEEKLY, DAILY)
 * @param baseDate 基准日期，默认为当前时间
 * @returns 包含周期起始时间 (periodStart) 和结束时间 (periodEnd) 的对象
 */
export const getdayRange = (
  cadence: TrackingCadence,
  baseDate = new Date(),
) => {
  const [y, m, d] = [
    baseDate.getUTCFullYear(),
    baseDate.getUTCMonth(),
    baseDate.getUTCDate(),
  ];
  let periodStart: Date;
  let periodEnd: Date;
  switch (cadence) {
    case TrackingCadence.YEARLY:
      periodStart = new Date(Date.UTC(y, 0, 1));
      periodEnd = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
      break;
    case TrackingCadence.QUARTERLY: {
      const quarterStart = Math.floor(m / 3) * 3;
      periodStart = new Date(Date.UTC(y, quarterStart, 1));
      periodEnd = new Date(Date.UTC(y, quarterStart + 3, 0, 23, 59, 59, 999));
      break;
    }
    case TrackingCadence.MONTHLY:
      periodStart = new Date(Date.UTC(y, m, 1));
      periodEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
      break;
    case TrackingCadence.WEEKLY: {
      const day = baseDate.getUTCDay() || 7;
      periodStart = new Date(Date.UTC(y, m, d - day + 1));
      periodEnd = new Date(Date.UTC(y, m, d + 7 - day, 23, 59, 59, 999));
      break;
    }
    default:
      periodStart = new Date(Date.UTC(y, m, d));
      periodEnd = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
  }
  return { periodStart, periodEnd };
};
