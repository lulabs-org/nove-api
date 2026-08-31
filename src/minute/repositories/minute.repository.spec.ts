import { MeetingPlatform, RecordingSource } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { MinuteRepository } from './minute.repository';

describe('MinuteRepository list and meeting context', () => {
  const activeMeeting = {
    id: 'meeting-1',
    title: '产品周会',
    platform: MeetingPlatform.TENCENT_MEETING,
    startAt: new Date('2026-08-31T01:00:00Z'),
    endAt: null,
    deletedAt: null,
  };

  it('searches external IDs and active meeting titles with stable pagination order', async () => {
    const count = jest.fn().mockResolvedValue(2);
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'minute-1',
        source: RecordingSource.PLATFORM_AUTO,
        meeting: activeMeeting,
      },
      {
        id: 'minute-2',
        source: RecordingSource.THIRD_PARTY,
        meeting: { ...activeMeeting, id: 'meeting-2', deletedAt: new Date() },
      },
    ]);
    const transaction = jest.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
    const repository = new MinuteRepository({
      minute: { count, findMany },
      $transaction: transaction,
    } as unknown as PrismaService);

    const result = await repository.findMany({
      search: '周会',
      meetingId: 'meeting-1',
      source: RecordingSource.PLATFORM_AUTO,
      skip: 10,
      take: 10,
    });

    const expectedWhere = {
      deletedAt: null,
      OR: [
        {
          externalId: {
            contains: '周会',
            mode: 'insensitive',
          },
        },
        {
          meeting: {
            is: {
              deletedAt: null,
              title: {
                contains: '周会',
                mode: 'insensitive',
              },
            },
          },
        },
      ],
      meetingId: 'meeting-1',
      source: RecordingSource.PLATFORM_AUTO,
    };
    expect(count).toHaveBeenCalledWith({ where: expectedWhere });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expectedWhere,
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    );
    expect(result.records[0].meeting).toEqual(
      expect.objectContaining({ id: 'meeting-1', title: '产品周会' }),
    );
    expect(result.records[0].meeting).not.toHaveProperty('deletedAt');
    expect(result.records[1].meeting).toBeNull();
  });

  it('returns a nullable active meeting summary from minute detail', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'minute-1',
      source: RecordingSource.PLATFORM_AUTO,
      meeting: activeMeeting,
    });
    const repository = new MinuteRepository({
      minute: { findUnique },
    } as unknown as PrismaService);

    const result = await repository.findById('minute-1');

    expect(result?.id).toBe('minute-1');
    expect(result?.source).toBe(RecordingSource.PLATFORM_AUTO);
    expect(result?.meeting?.id).toBe('meeting-1');
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'minute-1', deletedAt: null } }),
    );
  });
});
