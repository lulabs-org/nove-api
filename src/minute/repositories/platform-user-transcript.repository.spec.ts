/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PrismaService } from '@/prisma/prisma.service';
import { PlatformUserTranscriptRepository } from './platform-user-transcript.repository';

describe('PlatformUserTranscriptRepository', () => {
  const platformUser = { findFirst: jest.fn() };
  const meeting = { findMany: jest.fn() };
  const minute = { findFirst: jest.fn() };
  const prisma = { platformUser, meeting, minute } as unknown as PrismaService;
  const repository = new PlatformUserTranscriptRepository(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('queries every meeting type through active participation and a half-open range', async () => {
    meeting.findMany.mockResolvedValue([]);
    const startDate = new Date('2026-08-01T00:00:00+08:00');
    const endDate = new Date('2026-09-01T00:00:00+08:00');

    await repository.findMeetingTranscripts(
      'platform-user-1',
      startDate,
      endDate,
    );

    expect(meeting.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          startAt: { gte: startDate, lt: endDate },
          participants: {
            some: { ptUserId: 'platform-user-1', deletedAt: null },
          },
        },
        select: expect.objectContaining({
          minutes: expect.objectContaining({
            where: { deletedAt: null },
            select: expect.objectContaining({
              transcripts: expect.objectContaining({
                select: expect.objectContaining({
                  segments: expect.objectContaining({
                    where: { speakerId: 'platform-user-1' },
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    );
  });

  it('loads all transcript segments while filtering the minute membership', async () => {
    minute.findFirst.mockResolvedValue(null);

    await repository.findMinuteContextSource('minute-1', 'platform-user-1');

    expect(minute.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'minute-1',
          deletedAt: null,
          meeting: { is: { deletedAt: null } },
        },
        select: expect.objectContaining({
          meeting: {
            select: {
              participants: expect.objectContaining({
                where: {
                  ptUserId: 'platform-user-1',
                  deletedAt: null,
                },
              }),
            },
          },
          transcripts: expect.objectContaining({
            select: expect.objectContaining({
              segments: expect.not.objectContaining({
                where: expect.anything(),
              }),
            }),
          }),
        }),
      }),
    );
  });
});
