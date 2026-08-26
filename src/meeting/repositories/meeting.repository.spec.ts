import { ProcessingStatus } from '../../minute/enums/status.enum';
/**
 * @fileoverview Unit tests for MeetingRepository
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MeetingRepository } from './meeting.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { MeetingPlatform, MeetingType, Prisma } from '@prisma/client';

describe('MeetingRepository', () => {
  let repository: MeetingRepository;
  let prismaService: PrismaService & {
    meeting: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      groupBy: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    const mockPrismaService = {
      meeting: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<MeetingRepository>(MeetingRepository);
    prismaService = module.get(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('checks meeting existence without loading meeting details', async () => {
    (prismaService.meeting.findUnique as jest.Mock).mockResolvedValue({
      id: 'meeting-1',
    });

    await expect(repository.exists('meeting-1')).resolves.toBe(true);
    expect(prismaService.meeting.findUnique).toHaveBeenCalledWith({
      where: { id: 'meeting-1', deletedAt: null },
      select: { id: true },
    });
  });

  describe('upsertMeetingRecord', () => {
    const platform = MeetingPlatform.TENCENT_MEETING;
    const platformMeetingId = 'test-meeting-123';
    const meetingData = {
      title: 'Test Meeting',
      meetingCode: 'TEST123',
      type: MeetingType.SCHEDULED,
      hostId: 'host123',
      startAt: new Date('2023-01-01T10:00:00Z'),
      endAt: new Date('2023-01-01T11:00:00Z'),
      durationSeconds: 3600,
      hasRecording: true,
      recordingStatus: ProcessingStatus.COMPLETED,
      processingStatus: ProcessingStatus.PENDING,
      metadata: { test: 'data' },
    };

    it('should create a new meeting record when it does not exist', async () => {
      const mockCreatedMeeting = {
        id: 'meeting-123',
        platform,
        meetingId: platformMeetingId,
        ...meetingData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.meeting.upsert as jest.Mock).mockResolvedValue(
        mockCreatedMeeting,
      );

      const result = await repository.upsert(
        platform,
        platformMeetingId,
        '', // Default empty subMeetingId
        meetingData,
      );

      expect(prismaService.meeting.upsert).toHaveBeenCalledWith({
        where: {
          platform_meetingId_subMeetingId: {
            platform,
            meetingId: platformMeetingId,
            subMeetingId: '',
          },
          deletedAt: null,
        },
        update: meetingData,
        create: {
          platform,
          meetingId: platformMeetingId,
          subMeetingId: '',
          ...meetingData,
        },
      });
      expect(result).toEqual(mockCreatedMeeting);
    });

    it('should update an existing meeting record when it exists', async () => {
      const mockUpdatedMeeting = {
        id: 'meeting-456',
        platform,
        meetingId: platformMeetingId,
        title: 'Updated Meeting Title',
        meetingCode: 'UPDATED123',
        type: MeetingType.SCHEDULED,
        hostId: 'host456',
        startAt: new Date('2023-01-01T10:00:00Z'),
        endAt: new Date('2023-01-01T12:00:00Z'),
        durationSeconds: 7200,
        hasRecording: true,
        recordingStatus: ProcessingStatus.COMPLETED,
        processingStatus: ProcessingStatus.COMPLETED,
        metadata: { updated: 'data' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateData = {
        title: 'Updated Meeting Title',
        type: MeetingType.SCHEDULED,
        endAt: new Date('2023-01-01T12:00:00Z'),
        durationSeconds: 7200,
        processingStatus: ProcessingStatus.COMPLETED,
        metadata: { updated: 'data' },
      };

      (prismaService.meeting.upsert as jest.Mock).mockResolvedValue(
        mockUpdatedMeeting,
      );

      const result = await repository.upsert(
        platform,
        platformMeetingId,
        '', // Default empty subMeetingId
        updateData,
      );

      expect(prismaService.meeting.upsert).toHaveBeenCalledWith({
        where: {
          platform_meetingId_subMeetingId: {
            platform,
            meetingId: platformMeetingId,
            subMeetingId: '',
          },
          deletedAt: null,
        },
        update: updateData,
        create: {
          platform,
          meetingId: platformMeetingId,
          subMeetingId: '',
          ...updateData,
        },
      });
      expect(result).toEqual(mockUpdatedMeeting);
    });

    it('should handle different platforms correctly', async () => {
      const feishuPlatform = MeetingPlatform.FEISHU;
      const feishuMeetingId = 'feishu-meeting-456';
      const feishuMeetingData = {
        title: 'Feishu Meeting',
        type: MeetingType.WEBINAR,
        startAt: new Date('2023-02-01T14:00:00Z'),
        endAt: new Date('2023-02-01T15:30:00Z'),
      };

      const mockFeishuMeeting = {
        id: 'feishu-meeting-789',
        platform: feishuPlatform,
        meetingId: feishuMeetingId,
        ...feishuMeetingData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.meeting.upsert as jest.Mock).mockResolvedValue(
        mockFeishuMeeting,
      );

      const result = await repository.upsert(
        feishuPlatform,
        feishuMeetingId,
        '', // Default empty subMeetingId
        feishuMeetingData,
      );

      expect(prismaService.meeting.upsert).toHaveBeenCalledWith({
        where: {
          platform_meetingId_subMeetingId: {
            platform: feishuPlatform,
            meetingId: feishuMeetingId,
            subMeetingId: '',
          },
          deletedAt: null,
        },
        update: feishuMeetingData,
        create: {
          platform: feishuPlatform,
          meetingId: feishuMeetingId,
          subMeetingId: '',
          ...feishuMeetingData,
        },
      });
      expect(result).toEqual(mockFeishuMeeting);
    });

    it('should propagate errors from Prisma', async () => {
      const error = new Error('Database connection failed');
      (prismaService.meeting.upsert as jest.Mock).mockRejectedValue(error);

      await expect(
        repository.upsert(
          platform,
          platformMeetingId,
          '', // Default empty subMeetingId
          meetingData,
        ),
      ).rejects.toThrow(error);

      expect(prismaService.meeting.upsert).toHaveBeenCalledWith({
        where: {
          platform_meetingId_subMeetingId: {
            platform,
            meetingId: platformMeetingId,
            subMeetingId: '',
          },
          deletedAt: null,
        },
        update: meetingData,
        create: {
          platform,
          meetingId: platformMeetingId,
          subMeetingId: '',
          ...meetingData,
        },
      });
    });

    it('should work with minimal data', async () => {
      const minimalData = {
        title: 'Minimal Meeting',
        type: MeetingType.SCHEDULED,
      };

      const mockMinimalMeeting = {
        id: 'minimal-meeting-123',
        platform,
        meetingId: platformMeetingId,
        ...minimalData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.meeting.upsert as jest.Mock).mockResolvedValue(
        mockMinimalMeeting,
      );

      const result = await repository.upsert(
        platform,
        platformMeetingId,
        '', // Default empty subMeetingId
        minimalData,
      );

      expect(prismaService.meeting.upsert).toHaveBeenCalledWith({
        where: {
          platform_meetingId_subMeetingId: {
            platform,
            meetingId: platformMeetingId,
            subMeetingId: '',
          },
          deletedAt: null,
        },
        update: minimalData,
        create: {
          platform,
          meetingId: platformMeetingId,
          subMeetingId: '',
          ...minimalData,
        },
      });
      expect(result).toEqual(mockMinimalMeeting);
    });
  });

  describe('get', () => {
    it('should expose the host under the API contract field name', async () => {
      (prismaService.meeting.findUnique as jest.Mock).mockResolvedValue({
        id: 'meeting-with-host',
        createdById: 'must-not-leak',
        hostId: 'platform-user-1',
        host: {
          id: 'platform-user-1',
          displayName: '杨仕明',
          localUserId: 'local-user-1',
        },
        minutes: [],
      });

      const result = await repository.findById('meeting-with-host');

      expect(result).toEqual(
        expect.objectContaining({
          id: 'meeting-with-host',
          host: {
            platformUserId: 'platform-user-1',
            displayName: '杨仕明',
            userId: 'local-user-1',
          },
          hasRecording: false,
          minutes: [],
        }),
      );
      expect(result).not.toHaveProperty('createdById');
      expect(prismaService.meeting.findUnique).toHaveBeenCalledWith({
        where: { id: 'meeting-with-host', deletedAt: null },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        select: expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          minutes: expect.objectContaining({
            where: { deletedAt: null },
          }),
        }),
      });
    });

    it('should derive hasRecording from active recording records', async () => {
      const startAt = new Date('2026-08-01T10:00:00.000Z');
      const endAt = new Date('2026-08-01T11:00:00.000Z');
      (prismaService.meeting.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'meeting-with-recording',
          title: 'Meeting with recording',
          platform: MeetingPlatform.TENCENT_MEETING,
          startAt,
          endAt,
          host: {
            id: 'platform-user-1',
            displayName: '杨仕明',
            localUserId: null,
          },
          participantCount: null,
          _count: { participants: 3, minutes: 1 },
          description: 'must-not-leak-from-list',
        },
        {
          id: 'meeting-without-recording',
          title: 'Meeting without recording',
          platform: MeetingPlatform.FEISHU,
          startAt: null,
          endAt: null,
          host: null,
          participantCount: 8,
          _count: { participants: 2, minutes: 0 },
          metadata: { mustNotLeak: true },
        },
      ]);
      (prismaService.meeting.count as jest.Mock).mockResolvedValue(2);

      const result = await repository.get({ page: 1, limit: 10 });

      expect(result.records).toEqual([
        {
          id: 'meeting-with-recording',
          title: 'Meeting with recording',
          platform: MeetingPlatform.TENCENT_MEETING,
          startAt,
          endAt,
          host: {
            platformUserId: 'platform-user-1',
            displayName: '杨仕明',
            userId: null,
          },
          participantCount: 3,
          hasRecording: true,
        },
        {
          id: 'meeting-without-recording',
          title: 'Meeting without recording',
          platform: MeetingPlatform.FEISHU,
          startAt: null,
          endAt: null,
          host: null,
          participantCount: 8,
          hasRecording: false,
        },
      ]);
      expect(prismaService.meeting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: {
            id: true,
            title: true,
            platform: true,
            startAt: true,
            endAt: true,
            participantCount: true,
            host: {
              select: { id: true, displayName: true, localUserId: true },
            },
            _count: {
              select: {
                participants: { where: { deletedAt: null } },
                minutes: { where: { deletedAt: null } },
              },
            },
          },
        }),
      );
      expect(result.records[0]).not.toHaveProperty('description');
      expect(result.records[1]).not.toHaveProperty('metadata');
    });

    it('should search by title or host display name', async () => {
      (prismaService.meeting.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.meeting.count as jest.Mock).mockResolvedValue(0);

      await repository.get({ search: '杨仕明' });

      expect(prismaService.meeting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            OR: [
              { title: { contains: '杨仕明', mode: 'insensitive' } },
              {
                host: {
                  displayName: {
                    contains: '杨仕明',
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }),
        }),
      );
    });

    it('derives pending status filters and returns no records for skipped', async () => {
      (prismaService.meeting.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.meeting.count as jest.Mock).mockResolvedValue(0);

      await repository.get({ status: ProcessingStatus.PENDING });
      await repository.get({ status: ProcessingStatus.SKIPPED });

      const calls = prismaService.meeting.findMany.mock
        .calls as unknown as Array<[{ where: Prisma.MeetingWhereInput }]>;
      const [pendingQuery] = calls.at(-2) as [
        { where: Prisma.MeetingWhereInput },
      ];
      const [skippedQuery] = calls.at(-1) as [
        { where: Prisma.MeetingWhereInput },
      ];

      expect(Array.isArray(pendingQuery.where.AND)).toBe(true);
      const [pendingCondition] = pendingQuery.where
        .AND as Prisma.MeetingWhereInput[];
      expect(Array.isArray(pendingCondition.AND)).toBe(true);
      expect(skippedQuery.where.AND).toEqual([{ id: { in: [] } }]);
    });

    it('uses an exclusive end date for half-open meeting ranges', async () => {
      const startDate = new Date('2026-08-24T00:00:00.000+08:00');
      const endDate = new Date('2026-08-25T00:00:00.000+08:00');
      (prismaService.meeting.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.meeting.count as jest.Mock).mockResolvedValue(0);

      await repository.get({ startDate, endDate });

      const [query] = prismaService.meeting.findMany.mock.calls.at(
        -1,
      ) as unknown as [{ where: { startAt: unknown } }];
      expect(query.where.startAt).toEqual({ gte: startDate, lt: endDate });
    });
  });

  describe('getStats', () => {
    it('should aggregate real meeting statistics within the date range', async () => {
      const startDate = new Date('2026-08-01T00:00:00.000Z');
      const endDate = new Date('2026-08-31T23:59:59.999Z');
      (prismaService.meeting.count as jest.Mock)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      (prismaService.meeting.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          {
            platform: MeetingPlatform.TENCENT_MEETING,
            _count: { _all: 3 },
          },
        ])
        .mockResolvedValueOnce([
          { type: MeetingType.SCHEDULED, _count: { _all: 3 } },
        ]);
      (prismaService.meeting.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repository.getStats({ startDate, endDate });

      expect(result).toEqual({
        total: 3,
        platformStats: [
          { platform: MeetingPlatform.TENCENT_MEETING, count: 3 },
        ],
        statusStats: [
          { status: ProcessingStatus.PENDING, count: 1 },
          { status: ProcessingStatus.PROCESSING, count: 1 },
          { status: ProcessingStatus.COMPLETED, count: 1 },
          { status: ProcessingStatus.FAILED, count: 0 },
          { status: ProcessingStatus.SKIPPED, count: 0 },
        ],
        typeStats: [{ type: MeetingType.SCHEDULED, count: 3 }],
        recentMeetings: [],
      });
      expect(prismaService.meeting.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          startAt: { gte: startDate, lt: endDate },
        },
      });
      expect(prismaService.meeting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
          orderBy: { startAt: { sort: 'desc', nulls: 'last' } },
        }),
      );
    });
  });

  describe('softDelete', () => {
    it('returns the record with the timestamp persisted by Prisma', async () => {
      const deletedAt = new Date('2026-08-13T01:00:00.000Z');
      (prismaService.meeting.update as jest.Mock).mockResolvedValue({
        id: 'meeting-1',
        hostId: null,
        host: null,
        minutes: [],
        deletedAt,
      });

      const result = await repository.softDelete('meeting-1');

      expect(result).toEqual(
        expect.objectContaining({ id: 'meeting-1', deletedAt }),
      );
      expect(prismaService.meeting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'meeting-1', deletedAt: null },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          select: expect.any(Object),
        }),
      );
    });
  });
});
