import { TrackingCadence } from '@prisma/client';

export interface PeriodContext {
  sourceCadence: TrackingCadence | 'RECORDING';
  label: string;
}

const CONTEXT: Partial<Record<TrackingCadence, PeriodContext>> = {
  [TrackingCadence.DAILY]: { sourceCadence: 'RECORDING', label: '本日' },
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

export const getPeriodContext = (cadence: TrackingCadence) => CONTEXT[cadence];

export const getdayRange = (
  cadence: TrackingCadence,
  targetDate = new Date(),
) => {
  const [y, m, d] = [
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  ];
  let periodStart: Date;
  let periodEnd: Date;
  switch (cadence) {
    case TrackingCadence.YEARLY:
      periodStart = new Date(y, 0, 1);
      periodEnd = new Date(y, 11, 31, 23, 59, 59, 999);
      break;
    case TrackingCadence.QUARTERLY: {
      const quarterStart = Math.floor(m / 3) * 3;
      periodStart = new Date(y, quarterStart, 1);
      periodEnd = new Date(y, quarterStart + 3, 0, 23, 59, 59, 999);
      break;
    }
    case TrackingCadence.MONTHLY:
      periodStart = new Date(y, m, 1);
      periodEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);
      break;
    case TrackingCadence.WEEKLY: {
      const day = targetDate.getDay() || 7;
      periodStart = new Date(y, m, d - day + 1);
      periodEnd = new Date(y, m, d + 7 - day, 23, 59, 59, 999);
      break;
    }
    default:
      periodStart = new Date(y, m, d);
      periodEnd = new Date(y, m, d, 23, 59, 59, 999);
  }
  return { periodStart, periodEnd };
};
