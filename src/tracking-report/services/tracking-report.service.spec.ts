import { BadRequestException } from '@nestjs/common';
import { TrackingCadence, TrackingReportType } from '@prisma/client';
import {
  trackingReportListSelect,
  TrackingReportRepository,
} from '../repositories/tracking-report.repository';
import { TrackingReportService } from './tracking-report.service';

describe('TrackingReportService', () => {
  const repository = {
    saveNewVersion: jest.fn(),
    findMany: jest.fn(),
    findSubjectByReportId: jest.fn(),
  };
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

  it('keeps the list database projection limited to subject summary fields', () => {
    expect(trackingReportListSelect.subjectUser).toEqual({
      select: {
        profile: { select: { displayName: true, avatar: true } },
      },
    });
    expect(trackingReportListSelect.platformUser).toEqual({
      select: { displayName: true },
    });
    expect(trackingReportListSelect.project).toEqual({
      select: { title: true, image: true },
    });
    expect(JSON.stringify(trackingReportListSelect)).not.toMatch(
      /username|email|countryCode|phone|ptUserId|ptUnionId|subtitle|category/,
    );
  });

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

  it('prefers the linked local user as the report subject', async () => {
    repository.findMany.mockResolvedValue({
      total: 1,
      data: [
        {
          id: 'report-1',
          subjectUserId: 'user-1',
          platformUserId: 'platform-1',
          projectId: null,
          subjectNameSnapshot: 'Platform Alice',
          trackingType: TrackingReportType.USER_PROFILE,
          subjectUser: {
            profile: { displayName: 'Alice', avatar: 'avatar.png' },
          },
          platformUser: {
            displayName: 'Platform Alice',
          },
          project: null,
        },
      ],
    });

    const result = await service.list({ page: 1, limit: 20, isLatest: true });

    expect(result.data[0]?.subject.kind).toBe('LOCAL_USER');
    expect(result.data[0]?.subject.displayName).toBe('Alice');
    expect(result.data[0]?.subject.isLinked).toBe(true);
    expect(result.data[0]?.subject).not.toHaveProperty('localUserId');
    expect(result.data[0]?.subject).not.toHaveProperty('localUser');
    expect(result.data[0]?.subject).not.toHaveProperty('nameSnapshot');
  });

  it('falls back to the platform identity when no local user is linked', async () => {
    repository.findMany.mockResolvedValue({
      total: 1,
      data: [
        {
          id: 'report-2',
          subjectUserId: null,
          platformUserId: 'platform-2',
          projectId: null,
          subjectNameSnapshot: 'Historical Cecilia',
          trackingType: TrackingReportType.PERIODIC_MEETING_SUMMARY,
          subjectUser: null,
          platformUser: {
            displayName: 'Cecilia',
          },
          project: null,
        },
      ],
    });

    const result = await service.list({ page: 1, limit: 20, isLatest: true });

    expect(result.data[0]?.subject).toEqual(
      expect.objectContaining({
        kind: 'PLATFORM_USER',
        displayName: 'Cecilia',
        isLinked: false,
      }),
    );
  });

  it('uses the project as the subject for project progress reports', async () => {
    repository.findMany.mockResolvedValue({
      total: 1,
      data: [
        {
          id: 'report-3',
          subjectUserId: null,
          platformUserId: null,
          projectId: 'project-1',
          subjectNameSnapshot: 'Alice',
          trackingType: TrackingReportType.PROJECT_PROGRESS,
          subjectUser: null,
          platformUser: null,
          project: {
            title: 'AI 课程项目',
            image: 'project.png',
          },
        },
      ],
    });

    const result = await service.list({ page: 1, limit: 20, isLatest: true });

    expect(result.data[0]?.subject.kind).toBe('PROJECT');
    expect(result.data[0]?.subject.displayName).toBe('AI 课程项目');
    expect(result.data[0]?.subject).not.toHaveProperty('projectId');
    expect(result.data[0]?.subject).not.toHaveProperty('project');
  });

  it('loads complete identity details only on demand', async () => {
    repository.findSubjectByReportId.mockResolvedValue({
      subjectUserId: 'user-1',
      platformUserId: 'platform-1',
      projectId: null,
      subjectNameSnapshot: 'Platform Alice',
      trackingType: TrackingReportType.USER_PROFILE,
      subjectUser: {
        id: 'user-1',
        username: 'alice',
        email: 'alice@example.com',
        countryCode: '+86',
        phone: '13800138000',
        profile: { displayName: 'Alice', avatar: 'avatar.png' },
      },
      platformUser: {
        id: 'platform-1',
        platform: 'TENCENT_MEETING',
        ptUserId: 'meeting-user-1',
        ptUnionId: 'union-1',
        displayName: 'Platform Alice',
      },
      project: null,
    });

    const subject = await service.getSubject('report-1');

    expect(repository.findSubjectByReportId).toHaveBeenCalledWith('report-1');
    expect(subject.localUser?.email).toBe('alice@example.com');
    expect(subject.platformUser?.ptUnionId).toBe('union-1');
  });
});
