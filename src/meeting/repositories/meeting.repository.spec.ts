/**
 * @fileoverview Unit tests for MeetingRepository
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MeetingRepository } from './meeting.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { MeetingPlatform, MeetingType, ProcessingStatus } from '@prisma/client';

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
        host: { id: 'platform-user-1', displayName: '杨仕明' },
        recordings: [],
      });

      const result = await repository.findById('meeting-with-host');

      expect(result).toEqual(
        expect.objectContaining({
          id: 'meeting-with-host',
          hostPlatformUserId: 'platform-user-1',
          host: { id: 'platform-user-1', displayName: '杨仕明' },
          hasRecording: false,
          recordings: [],
        }),
      );
      expect(result).not.toHaveProperty('createdById');
      expect(prismaService.meeting.findUnique).toHaveBeenCalledWith({
        where: { id: 'meeting-with-host', deletedAt: null },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        select: expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          recordings: expect.objectContaining({
            where: { deletedAt: null },
          }),
        }),
      });
    });

    it('should derive hasRecording from active recording records', async () => {
      (prismaService.meeting.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'meeting-with-recording',
          hostId: 'platform-user-1',
          host: { id: 'platform-user-1', displayName: '杨仕明' },
          hasRecording: false,
          recordings: [{ id: 'recording-1' }],
          participantCount: null,
          _count: { participants: 3 },
        },
        {
          id: 'meeting-without-recording',
          hostId: null,
          host: null,
          hasRecording: true,
          recordings: [],
          participantCount: 8,
          _count: { participants: 2 },
        },
      ]);
      (prismaService.meeting.count as jest.Mock).mockResolvedValue(2);

      const result = await repository.get({ page: 1, limit: 10 });

      expect(result.records).toEqual([
        {
          id: 'meeting-with-recording',
          hostPlatformUserId: 'platform-user-1',
          host: { id: 'platform-user-1', displayName: '杨仕明' },
          participantCount: 3,
          hasRecording: true,
        },
        {
          id: 'meeting-without-recording',
          host: null,
          hostPlatformUserId: null,
          participantCount: 8,
          hasRecording: false,
        },
      ]);
      expect(prismaService.meeting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            recordings: {
              where: { deletedAt: null },
              select: { id: true },
            },
            host: {
              select: { id: true, displayName: true },
            },
            _count: {
              select: {
                participants: { where: { deletedAt: null } },
              },
            },
          },
        }),
      );
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
  });

  describe('getStats', () => {
    it('should aggregate real meeting statistics within the date range', async () => {
      const startDate = new Date('2026-08-01T00:00:00.000Z');
      const endDate = new Date('2026-08-31T23:59:59.999Z');
      (prismaService.meeting.count as jest.Mock).mockResolvedValue(3);
      (prismaService.meeting.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          {
            platform: MeetingPlatform.TENCENT_MEETING,
            _count: { _all: 3 },
          },
        ])
        .mockResolvedValueOnce([
          {
            processingStatus: ProcessingStatus.COMPLETED,
            _count: { _all: 2 },
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
        statusStats: [{ status: ProcessingStatus.COMPLETED, count: 2 }],
        typeStats: [{ type: MeetingType.SCHEDULED, count: 3 }],
        recentMeetings: [],
      });
      expect(prismaService.meeting.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          startAt: { gte: startDate, lte: endDate },
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
        recordings: [],
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
