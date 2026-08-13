import { TrackingCadence, TrackingReportType } from '@prisma/client';
import { LlmService } from '@/llm/llm.service';
import { PrismaService } from '@/prisma/prisma.service';
import { TrackingReportRepository } from '@/tracking-report/tracking-report.repository';
import { PeriodSummaryService } from './period-summary.service';

describe('PeriodSummaryService', () => {
  const prisma = {
    recordingParticipantSummary: { findMany: jest.fn() },
    userTrackingReport: { findMany: jest.fn() },
  };
  const reports = { saveNewVersion: jest.fn() };
  const llm = {
    createChatCompletion: jest.fn().mockResolvedValue('aggregate'),
  };
  const service = new PeriodSummaryService(
    prisma as unknown as PrismaService,
    reports as unknown as TrackingReportRepository,
    llm as unknown as LlmService,
    { model: 'test-model' } as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    llm.createChatCompletion.mockResolvedValue('aggregate');
    reports.saveNewVersion.mockResolvedValue({ id: 'created' });
  });

  it('creates a daily report with recording evidence and local-user identity', async () => {
    prisma.recordingParticipantSummary.findMany.mockResolvedValue([
      {
        id: 'summary-1',
        partSummary: 'meeting summary',
        userName: 'Alice',
        observedStartAt: new Date('2026-08-13T01:00:00Z'),
        observedEndAt: new Date('2026-08-13T02:00:00Z'),
        platformUserId: 'platform-1',
        platformUser: { localUserId: 'user-1' },
      },
    ]);

    await service.generateSummaries({
      periodType: TrackingCadence.DAILY,
      targetDate: new Date('2026-08-13T12:00:00Z'),
    });

    expect(reports.saveNewVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectUserId: 'user-1',
        trackingType: TrackingReportType.PERIODIC_MEETING_SUMMARY,
        cadence: TrackingCadence.DAILY,
        recordingSummaryIds: ['summary-1'],
        sourceReportIds: [],
      }),
    );
  });

  it('creates a weekly report from daily report evidence', async () => {
    prisma.userTrackingReport.findMany.mockResolvedValue([
      {
        id: 'daily-1',
        content: 'daily summary',
        subjectNameSnapshot: 'Alice',
        periodStart: new Date('2026-08-10T00:00:00Z'),
        periodEnd: new Date('2026-08-10T23:59:59Z'),
        subjectUserId: null,
        platformUserId: 'platform-1',
      },
    ]);

    await service.generateSummaries({
      periodType: TrackingCadence.WEEKLY,
      targetDate: new Date('2026-08-13T12:00:00Z'),
    });

    expect(reports.saveNewVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        platformUserId: 'platform-1',
        cadence: TrackingCadence.WEEKLY,
        recordingSummaryIds: [],
        sourceReportIds: ['daily-1'],
      }),
    );
  });
});
