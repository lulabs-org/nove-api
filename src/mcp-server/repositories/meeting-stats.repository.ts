import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { Meeting } from '@prisma/client';
import type { MeetingDetailsResult } from '../types/meeting-stats.types';

@Injectable()
export class MeetingStatsRepository {
  constructor(private readonly prisma: PrismaService) {}

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
