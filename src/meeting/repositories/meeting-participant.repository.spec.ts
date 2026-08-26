/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { MeetingParticipantRepository } from './meeting-participant.repository';

describe('MeetingParticipantRepository', () => {
  let repository: MeetingParticipantRepository;
  const prisma = {
    meetingParticipant: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingParticipantRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    repository = module.get(MeetingParticipantRepository);
  });

  it('returns active meeting participants with public platform-user fields', async () => {
    prisma.meetingParticipant.findMany.mockResolvedValue([
      {
        id: 'participant-1',
        meetingId: 'meeting-1',
        ptUserId: 'platform-user-1',
        firstJoinTime: null,
        lastLeaveTime: null,
        totalDurationSeconds: 600,
        ptUser: {
          id: 'platform-user-1',
          platform: 'TENCENT_MEETING',
          ptUserId: 'tencent-user-1',
          displayName: '平台昵称',
          avatarUrl: null,
          user: {
            id: 'user-1',
            username: 'yangshiming',
            email: 'user@example.com',
            countryCode: '+86',
            phone: '13800138000',
            profile: { displayName: '杨仕明', avatar: 'avatar.png' },
          },
        },
      },
    ]);
    prisma.meetingParticipant.count.mockResolvedValue(1);

    const result = await repository.findMany('meeting-1', {
      skip: 0,
      take: 50,
      search: '杨',
    });

    expect(prisma.meetingParticipant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          meetingId: 'meeting-1',
          deletedAt: null,
          ptUser: expect.objectContaining({ OR: expect.any(Array) }),
        }),
        skip: 0,
        take: 50,
      }),
    );
    expect(result).toEqual({
      records: [
        expect.objectContaining({
          id: 'participant-1',
          platformUser: expect.objectContaining({
            id: 'platform-user-1',
            displayName: '平台昵称',
          }),
          user: expect.objectContaining({
            id: 'user-1',
            profile: { displayName: '杨仕明', avatar: 'avatar.png' },
          }),
        }),
      ],
      total: 1,
    });
    expect(result.records[0]).not.toHaveProperty('ptUserId');
    expect(result.records[0]).not.toHaveProperty('platformUserId');
    expect(result.records[0].platformUser).not.toHaveProperty('ptUserId');
  });

  it('returns platform identity when no local user is linked', async () => {
    prisma.meetingParticipant.findMany.mockResolvedValue([
      {
        id: 'participant-1',
        meetingId: 'meeting-1',
        ptUserId: 'platform-user-1',
        firstJoinTime: null,
        lastLeaveTime: null,
        totalDurationSeconds: 60,
        ptUser: {
          id: 'platform-user-1',
          platform: 'TENCENT_MEETING',
          ptUserId: 'tencent-user-1',
          displayName: '未绑定用户',
          avatarUrl: null,
          user: null,
        },
      },
    ]);
    prisma.meetingParticipant.count.mockResolvedValue(1);

    const result = await repository.findMany('meeting-1', {
      skip: 0,
      take: 50,
    });

    expect(result.records[0]).toEqual(
      expect.objectContaining({
        platformUser: expect.objectContaining({ id: 'platform-user-1' }),
        user: null,
      }),
    );
  });
});
