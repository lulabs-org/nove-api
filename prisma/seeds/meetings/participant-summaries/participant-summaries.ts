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
    const meeting = meetings.meetings[0].meeting;

    // 昨天的时间
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = new Date(yesterday.getTime() + 60 * 60 * 1000);

    // 计算上周周一和这周周一的时间
    const today = new Date();
    const currentDay = today.getDay(); // 0 (周日) 到 6 (周六)

    // 上周周一
    const daysToLastMonday = currentDay === 0 ? 8 : currentDay + 6;
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - daysToLastMonday);
    lastMonday.setHours(0, 0, 0, 0);

    // 这周周一
    const daysToThisMonday = currentDay === 0 ? 1 : currentDay - 1;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - daysToThisMonday);
    thisMonday.setHours(0, 0, 0, 0);

    // 生成 5 个随机日期（在上周周一到这周周一之间）
    const randomDates: Date[] = [];
    const totalDays = Math.floor(
      (thisMonday.getTime() - lastMonday.getTime()) / (1000 * 60 * 60 * 24),
    );

    // 固定随机种子，确保每次运行生成相同的随机日期
    const selectedDays = [2, 4, 6, 9, 11]; // 固定选择第 2, 4, 6, 9, 11 天

    for (let i = 0; i < 5; i++) {
      const dayOffset = selectedDays[i] % (totalDays + 1);
      const randomDate = new Date(lastMonday);
      randomDate.setDate(lastMonday.getDate() + dayOffset);
      randomDate.setHours(9, 0, 0, 0); // 设置为早上9点
      randomDates.push(randomDate);
    }

    // 创建 10 条 SINGLE 类型的记录（昨天的时间）
    const singleSummaries = await Promise.all(
      PARTICIPANT_SUMMARY_CONFIGS.map(async (config) => {
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
            periodStart: yesterday,
            periodEnd: yesterdayEnd,
          },
        });
      }),
    );

    // 创建 5 条 DAILY 类型的记录（上周周一到这周周一之间的随机日期）
    const dailySummaries = await Promise.all(
      PARTICIPANT_SUMMARY_CONFIGS.slice(0, 5).map(async (config, index) => {
        const periodStart = randomDates[index];
        const periodEnd = new Date(periodStart);
        periodEnd.setHours(23, 59, 59, 999); // 当天结束时间

        return await prisma.participantSummary.create({
          data: {
            periodType: PeriodType.DAILY,
            meetingId: meeting.id,
            userName: config.userName,
            partSummary: `【每日总结】${config.partSummary}`,
            keywords: config.keywords,
            generatedBy: GenerationMethod.AI,
            aiModel: 'gpt-4',
            confidence: 0.85 + Math.random() * 0.1,
            version: 1,
            isLatest: true,
            periodStart: periodStart,
            periodEnd: periodEnd,
          },
        });
      }),
    );

    const participantSummaries = [...singleSummaries, ...dailySummaries];

    console.log(
      `✅ 参与者会议总结创建完成，共 ${participantSummaries.length} 条记录 (${singleSummaries.length} 条 SINGLE, ${dailySummaries.length} 条 DAILY)`,
    );
    return participantSummaries;
  } catch (error) {
    console.error('❌ 创建参与者会议总结失败:', error);
    throw error;
  }
}
