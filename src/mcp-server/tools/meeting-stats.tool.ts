import { Injectable } from '@nestjs/common';
import { Tool, Context } from '@rekog/mcp-nest';
import { z } from 'zod';

@Injectable()
export class MeetingStatsTool {
  @Tool({
    name: 'get-meeting-stats',
    description: 'Get meeting statistics for a specific time period',
    parameters: z.object({
      startDate: z.string().describe('Start date in ISO format (YYYY-MM-DD)'),
      endDate: z.string().describe('End date in ISO format (YYYY-MM-DD)'),
    }),
  })
  async getMeetingStats(
    { startDate, endDate }: { startDate: string; endDate: string },
    context: Context,
  ) {
    await context.reportProgress({ progress: 33, total: 100 });

    const stats = {
      period: { startDate, endDate },
      totalMeetings: 25,
      totalDuration: 1500,
      totalParticipants: 180,
      averageDuration: 60,
      meetingsByDay: [
        { date: '2025-12-23', count: 5 },
        { date: '2025-12-24', count: 8 },
        { date: '2025-12-25', count: 3 },
        { date: '2025-12-26', count: 6 },
        { date: '2025-12-27', count: 3 },
      ],
    };

    await context.reportProgress({ progress: 66, total: 100 });

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
  getMeetingDetails({ meetingId }: { meetingId: string }) {
    const result = {
      meetingId,
      title: 'Team Weekly Sync',
      host: 'John Doe',
      startTime: new Date().toISOString(),
      duration: 60,
      participants: [
        { userId: 'user-1', name: 'Alice', joinTime: '09:00' },
        { userId: 'user-2', name: 'Bob', joinTime: '09:05' },
        { userId: 'user-3', name: 'Charlie', joinTime: '09:10' },
      ],
      status: 'completed',
      recording: {
        available: true,
        duration: 58,
        url: 'https://example.com/recording/abc123',
      },
    };
    return result;
  }
}
