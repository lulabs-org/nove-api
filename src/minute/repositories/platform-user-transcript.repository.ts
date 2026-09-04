import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

const transcriptSegmentSelect = {
  id: true,
  speakerId: true,
  speakerName: true,
  startTimeMs: true,
  endTimeMs: true,
  text: true,
  speaker: {
    select: {
      id: true,
      displayName: true,
    },
  },
} satisfies Prisma.TranscriptSegmentSelect;

const minuteContextSelect = {
  id: true,
  meeting: {
    select: {
      participants: {
        select: { id: true },
      },
    },
  },
  transcripts: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      segments: {
        orderBy: [{ startTimeMs: 'asc' }, { id: 'asc' }],
        select: transcriptSegmentSelect,
      },
    },
  },
} satisfies Prisma.MinuteSelect;

@Injectable()
export class PlatformUserTranscriptRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPlatformUser(platformUserId: string) {
    return this.prisma.platformUser.findFirst({
      where: { id: platformUserId, deletedAt: null },
      select: { id: true, displayName: true },
    });
  }

  findMinuteTranscripts(
    platformUserId: string,
    startDate: Date,
    endDate: Date,
    orgId?: string,
  ) {
    return this.prisma.minute.findMany({
      where: {
        deletedAt: null,
        ...(orgId ? { meeting: { orgId, deletedAt: null } } : {}),
        startAt: { gte: startDate, lt: endDate },
        OR: [
          { meeting: { is: null } },
          { meeting: { is: { deletedAt: null } } },
        ],
        transcripts: {
          some: {
            segments: { some: { speakerId: platformUserId } },
          },
        },
      },
      orderBy: [
        { startAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
        { id: 'asc' },
      ],
      select: {
        id: true,
        externalId: true,
        source: true,
        startAt: true,
        endAt: true,
        meeting: {
          select: {
            id: true,
            title: true,
            platform: true,
            type: true,
            startAt: true,
            endAt: true,
          },
        },
        transcripts: {
          where: {
            segments: { some: { speakerId: platformUserId } },
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            segments: {
              where: { speakerId: platformUserId },
              orderBy: [{ startTimeMs: 'asc' }, { id: 'asc' }],
              select: transcriptSegmentSelect,
            },
          },
        },
      },
    });
  }

  findMinuteContextSource(
    minuteId: string,
    platformUserId: string,
    orgId?: string,
  ) {
    return this.prisma.minute.findFirst({
      where: {
        id: minuteId,
        deletedAt: null,
        meeting: { is: { deletedAt: null, ...(orgId ? { orgId } : {}) } },
      },
      select: {
        ...minuteContextSelect,
        meeting: {
          select: {
            participants: {
              where: { ptUserId: platformUserId, deletedAt: null },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });
  }
}
