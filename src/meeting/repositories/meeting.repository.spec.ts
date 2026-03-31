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
});
