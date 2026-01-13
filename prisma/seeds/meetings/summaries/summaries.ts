/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-11 05:21:40
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 11:38:15
 * @FilePath: /nove_api/prisma/seeds/mock/meetings/summaries/summaries.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { PrismaClient, ProcessingStatus, Prisma } from '@prisma/client';
import { MEETING_SUMMARY_CONFIGS } from './config';
import type { CreatedMeetingSummaries } from './type';

export async function createMeetingSummary(
  prisma: PrismaClient,
  meetings: {
    meetings: Array<{
      meeting: Prisma.MeetingGetPayload<Record<string, never>>;
    }>;
  },
  platformUsers: {
    platformUsers: Array<{
      key: string;
      platformUser: Prisma.PlatformUserGetPayload<Record<string, never>>;
    }>;
  },
): Promise<CreatedMeetingSummaries['teamSummary']> {
  return prisma.meetingSummary.create({
    data: {
      meetingId: meetings.meetings[1].meeting.id,
      ...MEETING_SUMMARY_CONFIGS.teamSummary,
      createdId: platformUsers.platformUsers[1].platformUser.id,
      processingTime: 30000,
      status: ProcessingStatus.COMPLETED,
    },
  });
}
