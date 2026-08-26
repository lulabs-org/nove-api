import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  TargetTrackingReportType,
  TrackingReportCadence,
  TrackingTargetType,
} from '@prisma/client';
import {
  trackingReportListSelect,
  TrackingReportRepository,
} from '../repositories/tracking-report.repository';
import { TrackingReportService } from './tracking-report.service';

describe('TrackingReportService', () => {
  const repository = {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
  const service = new TrackingReportService(
    repository as unknown as TrackingReportRepository,
  );
  const base = {
    targetType: TrackingTargetType.USER,
    targetId: 'user-1',
    targetName: 'Alice',
    trackingType: TargetTrackingReportType.USER_PROFILE,
    cadence: TrackingReportCadence.MONTHLY,
    baseDate: new Date('2026-08-23T10:00:00+08:00'),
    content: 'profile',
  };

  beforeEach(() => jest.clearAllMocks());

  it('keeps list projection compact', () => {
    expect(trackingReportListSelect).not.toHaveProperty('content');
    expect(trackingReportListSelect.target.select).toEqual({
      id: true,
      targetType: true,
      targetId: true,
      nameSnapshot: true,
    });
    expect(trackingReportListSelect._count).toEqual({
      select: { sources: true },
    });
  });

  it('creates reports against the new tracking report repository', async () => {
    repository.create.mockResolvedValue({
      id: 'report-1',
      _count: { sources: 2 },
    });
    await expect(service.create(base)).resolves.toEqual({
      id: 'report-1',
      sourceCount: 2,
    });
    expect(repository.create).toHaveBeenCalledWith({
      targetType: TrackingTargetType.USER,
      targetId: 'user-1',
      targetName: 'Alice',
      trackingType: TargetTrackingReportType.USER_PROFILE,
      cadence: TrackingReportCadence.MONTHLY,
      content: 'profile',
      periodKey: '2026-08',
      periodStart: new Date('2026-07-31T16:00:00.000Z'),
      periodEnd: new Date('2026-08-31T16:00:00.000Z'),
      timezone: 'Asia/Shanghai',
    });
  });

  it('rejects reversed list ranges', async () => {
    await expect(
      service.list({
        periodStart: new Date('2026-09-01T00:00:00Z'),
        periodEnd: new Date('2026-08-01T00:00:00Z'),
        page: 1,
        limit: 20,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findMany).not.toHaveBeenCalled();
  });

  it('filters through TrackingTarget and maps source counts', async () => {
    repository.findMany.mockResolvedValue({
      total: 1,
      data: [{ id: 'report-1', _count: { sources: 3 } }],
    });
    await expect(
      service.list({
        targetType: TrackingTargetType.PROJECT,
        targetId: 'project-1',
        keyword: 'Roadmap',
        page: 1,
        limit: 20,
      }),
    ).resolves.toEqual({
      data: [{ id: 'report-1', sourceCount: 3 }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        target: {
          targetType: TrackingTargetType.PROJECT,
          targetId: 'project-1',
          nameSnapshot: { contains: 'Roadmap', mode: 'insensitive' },
        },
        deletedAt: null,
      }),
      0,
      20,
    );
  });

  it('returns 404 for deleted or unknown reports', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.get('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
