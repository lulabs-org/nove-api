import { Injectable } from '@nestjs/common';
import { Tool, Context, ToolScopes } from '@rekog/mcp-nest';
import { z } from 'zod';
import {
  MeetingStatsRepository,
  PlatformUserRepository,
} from '../repositories';
import { ParticipantSummaryRepository } from '@/meet-ai/repositories';
import { PeriodType } from '@prisma/client';

@Injectable()
export class MeetingStatsTool {
  constructor(
    private readonly meetingRepo: MeetingStatsRepository,
    private readonly ptUserRepo: PlatformUserRepository,
    private readonly participantSummaryRepo: ParticipantSummaryRepository,
  ) {}

  private validateDateRange(startDate: Date, endDate: Date): void {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 31) {
      throw new Error('Date range cannot exceed one month (31 days)');
    }

    if (startDate > endDate) {
      throw new Error('Start date must be before or equal to end date');
    }
  }

  @Tool({
    name: 'get-meeting-stats',
    description:
      'Get meeting statistics for a specific user within a time period',
    parameters: z.object({
      userId: z.string().describe('The ID of the user'),
      startDate: z.string().describe('Start date in ISO format (YYYY-MM-DD)'),
      endDate: z.string().describe('End date in ISO format (YYYY-MM-DD)'),
      periodType: z
        .enum(['SINGLE', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'])
        .default('SINGLE')
        .describe('The period type for statistics'),
    }),
  })
  @ToolScopes(['mcp-tool:meeting-stats'])
  async getMeetingStats(
    {
      userId,
      startDate,
      endDate,
      periodType,
    }: {
      userId: string;
      startDate: string;
      endDate: string;
      periodType: PeriodType;
    },
    context: Context,
  ) {
    await context.reportProgress({ progress: 10, total: 100 });

    const startDateObj = new Date(`${startDate}T00:00:00+08:00`);
    const endDateObj = new Date(`${endDate}T23:59:59.999+08:00`);

    this.validateDateRange(startDateObj, endDateObj);

    await context.reportProgress({ progress: 20, total: 100 });

    const platformUsers = await this.ptUserRepo.getActiveUsers(userId);

    await context.reportProgress({ progress: 40, total: 100 });

    const platformUserIds = platformUsers.map((u) => u.id);

    const summaries = await this.participantSummaryRepo.getSummaries({
      platformUserIds,
      startDate: startDateObj,
      endDate: endDateObj,
      periodType,
    });

    await context.reportProgress({ progress: 70, total: 100 });

    const uniqueMeetingIds = new Set<string>(
      summaries
        .filter(
          (s): s is typeof s & { meetingId: string } => s.meetingId !== null,
        )
        .map((s) => s.meetingId),
    );

    const meetings = await this.meetingRepo.getMeetings({
      meetingIds: Array.from(uniqueMeetingIds),
      startDate: startDateObj,
      endDate: endDateObj,
    });

    const meetingsByDay = new Map<string, number>();
    meetings.forEach((meeting) => {
      const dateKey = meeting.startAt
        ? meeting.startAt.toISOString().split('T')[0]
        : '';
      if (dateKey) {
        meetingsByDay.set(dateKey, (meetingsByDay.get(dateKey) || 0) + 1);
      }
    });

    const sortedMeetingsByDay = Array.from(meetingsByDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const stats = {
      userId,
      period: { startDate, endDate },
      platformUsers: platformUsers.length,
      totalMeetings: meetings.length,
      totalParticipants: summaries.length,
      meetingsByDay: sortedMeetingsByDay,
      summaries: summaries.map((s) => ({
        id: s.id,
        userName: s.userName,
        periodType: s.periodType,
        summary: s.partSummary,
        keywords: s.keywords,
        createdAt: s.createdAt.toISOString(),
        meeting: s.meeting
          ? {
              id: s.meeting.id,
              title: s.meeting.title,
              startTime: s.meeting.startAt?.toISOString(),
              duration: s.meeting.durationSeconds,
            }
          : null,
      })),
    };

    await context.reportProgress({ progress: 100, total: 100 });

    return stats;
  }

  @Tool({
    name: 'get-meeting-details',
    description: 'Get detailed information about a specific meeting',
    parameters: z.object({
      meetingId: z.string().describe('The ID of the meeting'),
    }),
  })
  @ToolScopes(['mcp-tool:meeting-details'])
  async getMeetingDetails({ meetingId }: { meetingId: string }) {
    const meeting = await this.meetingRepo.getDetails(meetingId);

    if (!meeting) {
      return {
        meetingId,
        status: 'error',
        message: `Meeting not found with ID: ${meetingId}`,
        data: null,
      };
    }

    const participants = meeting.participants.map((p) => ({
      userId: p.ptUser?.id,
      name: p.ptUser?.displayName || 'Unknown',
      email: p.ptUser?.email,
      joinTime: p.joinTime?.toISOString(),
      leaveTime: p.leftTime?.toISOString(),
      duration: p.durationSeconds,
    }));

    const recording = meeting.recordings[0];
    const recordingFile = recording?.files[0];

    return {
      meetingId: meeting.id,
      status: 'success',
      data: {
        title: meeting.title,
        creator: meeting.createdBy
          ? {
              userId: meeting.createdBy.id,
              name: meeting.createdBy.displayName,
            }
          : null,
        host: meeting.host
          ? {
              userId: meeting.host.id,
              name: meeting.host.displayName,
            }
          : null,
        startTime: meeting.startAt?.toISOString(),
        endTime: meeting.endAt?.toISOString(),
        duration: meeting.durationSeconds,
        participants,
        status: meeting.processingStatus,
        recording: recordingFile
          ? {
              available: true,
              duration: recordingFile.durationMs
                ? Number(recordingFile.durationMs) / 1000
                : undefined,
              url: recording.externalId,
            }
          : {
              available: false,
            },
      },
    };
  }
}
