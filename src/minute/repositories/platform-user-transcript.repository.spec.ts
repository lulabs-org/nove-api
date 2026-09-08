/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PrismaService } from '@/prisma/prisma.service';
import { PlatformUserTranscriptRepository } from './platform-user-transcript.repository';

describe('PlatformUserTranscriptRepository', () => {
  const platformUser = { findFirst: jest.fn() };
  const minute = { findFirst: jest.fn(), findMany: jest.fn() };
  const prisma = { platformUser, minute } as unknown as PrismaService;
  const repository = new PlatformUserTranscriptRepository(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('resolves a platform user only through meetings in the organization', async () => {
    platformUser.findFirst.mockResolvedValue(null);

    await repository.findPlatformUser('platform-user-1', 'org-1');

    expect(platformUser.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'platform-user-1',
        deletedAt: null,
        OR: [
          {
            meetingParticipants: {
              some: {
                deletedAt: null,
                meeting: { orgId: 'org-1', deletedAt: null },
              },
            },
          },
          {
            transcriptSegments: {
              some: {
                transcript: {
                  minute: {
                    is: {
                      deletedAt: null,
                      meeting: {
                        is: { orgId: 'org-1', deletedAt: null },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      select: { id: true, displayName: true },
    });
  });

  it('queries matching minutes by speech and a half-open minute range', async () => {
    minute.findMany.mockResolvedValue([]);
    const startDate = new Date('2026-08-01T00:00:00+08:00');
    const endDate = new Date('2026-09-01T00:00:00+08:00');

    await repository.findMinuteTranscripts(
      'platform-user-1',
      startDate,
      endDate,
      'org-1',
    );

    expect(minute.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          startAt: { gte: startDate, lt: endDate },
          meeting: { is: { orgId: 'org-1', deletedAt: null } },
          transcripts: {
            some: {
              segments: { some: { speakerId: 'platform-user-1' } },
            },
          },
        }),
        select: expect.objectContaining({
          transcripts: expect.objectContaining({
            where: {
              segments: { some: { speakerId: 'platform-user-1' } },
            },
            select: expect.objectContaining({
              segments: expect.objectContaining({
                where: { speakerId: 'platform-user-1' },
              }),
            }),
          }),
        }),
      }),
    );
  });

  it('loads all transcript segments while filtering the minute membership', async () => {
    minute.findFirst.mockResolvedValue(null);

    await repository.findMinuteContextSource(
      'minute-1',
      'platform-user-1',
      'org-1',
    );

    expect(minute.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'minute-1',
          deletedAt: null,
          meeting: { is: { orgId: 'org-1', deletedAt: null } },
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
