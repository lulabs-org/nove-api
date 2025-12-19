import { PrismaClient, PeriodType, ParticipantSummary } from '@prisma/client';

/**
 * 创建参与者会议总结数据
 */
export async function createParticipantSummaries(
  prisma: PrismaClient,
  meetingData: any,
) {
  console.log('📝 开始创建参与者总结数据...');

  // 只创建 SINGLE 类型的总结，platformUserId 和 userId 为空
  const singleSummaries: ParticipantSummary[] = [];

  for (let i = 1; i <= 10; i++) {
    const now = new Date();
    const startAt = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000); // i+1 小时前
    const endAt = new Date(now.getTime() - i * 60 * 60 * 1000); // i 小时前

    const summary = await prisma.participantSummary.create({
      data: {
        platformUserId: null, // 为空
        userId: null, // 为空
        periodType: PeriodType.SINGLE,
        meetingParticipantId: null, // 暂不关联具体参与记录
        meetingId: null, // 暂不关联具体会议
        startAt,
        endAt,
        partName: `测试参与者${i}`,
        partSummary: `这是第${i}条测试总结内容。会议讨论了项目进展、技术难点和下一步计划。主要观点包括：1) 需要加强团队协作；2) 优化开发流程；3) 提升代码质量。`,
      },
    });

    singleSummaries.push(summary);
    console.log(`✅ 创建参与者总结 ${i}/10: ${summary.partName}`);
  }

  console.log(`✅ 成功创建 ${singleSummaries.length} 条参与者总结`);

  return {
    singleSummaries,
  };
}
