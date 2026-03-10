import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { PlatformUser, Meeting, ParticipantSummary } from '@prisma/client';
import type { MeetingDetailsResult } from '../types/meeting-stats.types';

@Injectable()
export class MeetingStatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveUsers(localUserId: string): Promise<PlatformUser[]> {
    return this.prisma.platformUser.findMany({
      where: {
        localUserId,
        active: true,
        deletedAt: null,
      },
    });
  }

  async getSummaries(params: {
    platformUserIds: string[];
    startDate: Date;
    endDate: Date;
  }): Promise<
    (ParticipantSummary & {
      meeting: Pick<
        Meeting,
        'id' | 'title' | 'startAt' | 'endAt' | 'durationSeconds'
      > | null;
    })[]
  > {
    const { platformUserIds, startDate, endDate } = params;
    return this.prisma.participantSummary.findMany({
      where: {
        platformUserId: { in: platformUserIds },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
      },
      include: {
        meeting: {
          select: {
            id: true,
            title: true,
            startAt: true,
            endAt: true,
            durationSeconds: true,
          },
        },
      },
    });
  }

  async getMeetings(params: {
    meetingIds: string[];
    startDate: Date;
    endDate: Date;
  }): Promise<Meeting[]> {
    const { meetingIds, startDate, endDate } = params;
    return this.prisma.meeting.findMany({
      where: {
        id: { in: meetingIds },
        startAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
  }

  async getDetails(meetingId: string): Promise<MeetingDetailsResult | null> {
    return this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        host: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        participants: {
          include: {
            ptUser: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
        recordings: {
          where: {
            deletedAt: null,
          },
          include: {
            files: true,
          },
        },
      },
    });
  }
}
