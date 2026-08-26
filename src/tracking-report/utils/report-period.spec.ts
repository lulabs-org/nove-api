import { BadRequestException } from '@nestjs/common';
import { TrackingReportCadence } from '@prisma/client';
import { calculateTrackingReportPeriod } from './report-period';

describe('calculateTrackingReportPeriod', () => {
  it.each([
    [
      TrackingReportCadence.DAILY,
      '2026-08-23',
      '2026-08-22T16:00:00.000Z',
      '2026-08-23T16:00:00.000Z',
    ],
    [
      TrackingReportCadence.WEEKLY,
      '2026-W34',
      '2026-08-16T16:00:00.000Z',
      '2026-08-23T16:00:00.000Z',
    ],
    [
      TrackingReportCadence.MONTHLY,
      '2026-08',
      '2026-07-31T16:00:00.000Z',
      '2026-08-31T16:00:00.000Z',
    ],
    [
      TrackingReportCadence.QUARTERLY,
      '2026-Q3',
      '2026-06-30T16:00:00.000Z',
      '2026-09-30T16:00:00.000Z',
    ],
    [
      TrackingReportCadence.YEARLY,
      '2026',
      '2025-12-31T16:00:00.000Z',
      '2026-12-31T16:00:00.000Z',
    ],
  ])('derives %s in Asia/Shanghai', (cadence, key, start, end) => {
    const result = calculateTrackingReportPeriod(
      cadence,
      new Date('2026-08-23T10:00:00+08:00'),
      'Asia/Shanghai',
    );
    expect(result.periodKey).toBe(key);
    expect(result.periodStart.toISOString()).toBe(start);
    expect(result.periodEnd.toISOString()).toBe(end);
  });

  it('uses the ISO week-year at a calendar-year boundary', () => {
    const result = calculateTrackingReportPeriod(
      TrackingReportCadence.WEEKLY,
      new Date('2021-01-01T12:00:00+08:00'),
      'Asia/Shanghai',
    );
    expect(result.periodKey).toBe('2020-W53');
  });

  it('keeps local-day boundaries across daylight-saving transitions', () => {
    const result = calculateTrackingReportPeriod(
      TrackingReportCadence.DAILY,
      new Date('2026-03-08T12:00:00-04:00'),
      'America/New_York',
    );
    expect(result.periodStart.toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(result.periodEnd.toISOString()).toBe('2026-03-09T04:00:00.000Z');
  });

  it('rejects invalid IANA timezones', () => {
    expect(() =>
      calculateTrackingReportPeriod(
        TrackingReportCadence.DAILY,
        new Date(),
        'Mars/Olympus',
      ),
    ).toThrow(BadRequestException);
  });
});
