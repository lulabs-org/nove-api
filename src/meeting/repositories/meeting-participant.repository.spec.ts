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
        ptUser: { id: 'platform-user-1', displayName: '杨仕明' },
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
          user: { id: 'platform-user-1', displayName: '杨仕明' },
        }),
      ],
      total: 1,
    });
  });
});
