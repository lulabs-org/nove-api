import { BadRequestException } from '@nestjs/common';
import { TrackingReportCadence } from '@prisma/client';
import { DateTime } from 'luxon';

export interface TrackingReportPeriod {
  periodKey: string;
  periodStart: Date;
  periodEnd: Date;
  timezone: string;
}

function periodKey(start: DateTime, cadence: TrackingReportCadence) {
  switch (cadence) {
    case TrackingReportCadence.DAILY:
      return start.toFormat('yyyy-MM-dd');
    case TrackingReportCadence.WEEKLY:
      return `${start.weekYear}-W${String(start.weekNumber).padStart(2, '0')}`;
    case TrackingReportCadence.MONTHLY:
      return start.toFormat('yyyy-MM');
    case TrackingReportCadence.QUARTERLY:
      return `${start.year}-Q${start.quarter}`;
    case TrackingReportCadence.YEARLY:
      return String(start.year);
  }
}

export function calculateTrackingReportPeriod(
  cadence: TrackingReportCadence,
  baseDate: Date,
  timezone = 'Asia/Shanghai',
): TrackingReportPeriod {
  const localDate = DateTime.fromJSDate(baseDate, { zone: timezone });
  if (!localDate.isValid) {
    throw new BadRequestException(`无效的时区: ${timezone}`);
  }

  let start: DateTime;
  let end: DateTime;
  switch (cadence) {
    case TrackingReportCadence.DAILY:
      start = localDate.startOf('day');
      end = start.plus({ days: 1 });
      break;
    case TrackingReportCadence.WEEKLY:
      start = localDate.startOf('week');
      end = start.plus({ weeks: 1 });
      break;
    case TrackingReportCadence.MONTHLY:
      start = localDate.startOf('month');
      end = start.plus({ months: 1 });
      break;
    case TrackingReportCadence.QUARTERLY:
      start = localDate.startOf('quarter');
      end = start.plus({ quarters: 1 });
      break;
    case TrackingReportCadence.YEARLY:
      start = localDate.startOf('year');
      end = start.plus({ years: 1 });
      break;
  }

  return {
    periodKey: periodKey(start, cadence),
    periodStart: start.toUTC().toJSDate(),
    periodEnd: end.toUTC().toJSDate(),
    timezone,
  };
}
