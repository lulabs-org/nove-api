import { BadRequestException } from '@nestjs/common';
import { TrackingCadence, TrackingReportType } from '@prisma/client';
import { TrackingReportRepository } from './tracking-report.repository';
import { TrackingReportService } from './tracking-report.service';

describe('TrackingReportService', () => {
  const repository = { saveNewVersion: jest.fn(), findMany: jest.fn() };
  const service = new TrackingReportService(
    repository as unknown as TrackingReportRepository,
  );
  const base = {
    subjectUserId: 'user-1',
    subjectNameSnapshot: 'Alice',
    trackingType: TrackingReportType.USER_PROFILE,
    cadence: TrackingCadence.MONTHLY,
    periodStart: new Date('2026-08-01T00:00:00Z'),
    periodEnd: new Date('2026-08-31T23:59:59Z'),
    content: 'profile',
  };

  beforeEach(() => jest.clearAllMocks());

  it('requires a user or platform identity', () => {
    expect(() => service.create({ ...base, subjectUserId: undefined })).toThrow(
      BadRequestException,
    );
  });

  it('requires project scope only for project progress', () => {
    expect(() =>
      service.create({
        ...base,
        trackingType: TrackingReportType.PROJECT_PROGRESS,
      }),
    ).toThrow('必须提供 projectId');
    expect(() => service.create({ ...base, projectId: 'project-1' })).toThrow(
      '仅 PROJECT_PROGRESS',
    );
  });

  it('creates a report through the version-aware repository', async () => {
    repository.saveNewVersion.mockResolvedValue({ id: 'report-1' });
    await expect(service.create(base)).resolves.toEqual({ id: 'report-1' });
    expect(repository.saveNewVersion).toHaveBeenCalledWith(
      expect.objectContaining({ subjectUserId: 'user-1' }),
    );
  });
});
