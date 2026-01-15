import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class MeetingStatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActivePlatformUsersByLocalUserId(localUserId: string) {
    return this.prisma.platformUser.findMany({
      where: {
        localUserId,
        active: true,
        deletedAt: null,
      },
    });
  }

  async findParticipantSummaries(params: {
    platformUserIds: string[];
    startDate: Date;
    endDate: Date;
  }) {
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

  async findMeetingsByIdsAndStartAtRange(params: {
    meetingIds: string[];
    startDate: Date;
    endDate: Date;
  }) {
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

  async findMeetingDetailsById(meetingId: string) {
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
            platformUser: {
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
