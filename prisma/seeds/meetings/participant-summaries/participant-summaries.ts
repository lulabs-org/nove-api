/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-24
 * @Description: 创建参与者会议总结种子数据
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { PrismaClient, PeriodType, GenerationMethod } from '@prisma/client';
import { PARTICIPANT_SUMMARY_CONFIGS } from './config';
import type { ParticipantSummary } from './type';

export async function createParticipantSummaries(
  prisma: PrismaClient,
  meetings: {
    meetings: Array<{
      meeting: {
        id: string;
      };
    }>;
  },
): Promise<ParticipantSummary[]> {
  console.log('📝 开始创建参与者会议总结数据...');

  try {
    const participantSummaries = await Promise.all(
      PARTICIPANT_SUMMARY_CONFIGS.map(async (config) => {
        const meeting = meetings.meetings[0].meeting;
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

        return await prisma.participantSummary.create({
          data: {
            periodType: PeriodType.SINGLE,
            meetingId: meeting.id,
            userName: config.userName,
            partSummary: config.partSummary,
            keywords: config.keywords,
            generatedBy: GenerationMethod.AI,
            aiModel: 'gpt-4',
            confidence: 0.85 + Math.random() * 0.1,
            version: 1,
            isLatest: true,
            periodStart: now,
            periodEnd: oneHourLater,
          },
        });
      }),
    );

    console.log(
      `✅ 参与者会议总结创建完成，共 ${participantSummaries.length} 条记录`,
    );
    return participantSummaries;
  } catch (error) {
    console.error('❌ 创建参与者会议总结失败:', error);
    throw error;
  }
}
