import { PrismaClient } from '@prisma/client';
import { MEETING_CONFIGS } from './config';

export async function createMeetings(prisma: PrismaClient) {
  console.log('📅 开始创建会议数据...');

  try {
    const meetings = await Promise.all(
      MEETING_CONFIGS.map(async (config) => {
        const meeting = await prisma.meeting.upsert({
          where: {
            platform_meetingId_subMeetingId: {
              platform: config.platform,
              meetingId: config.meetingId,
              subMeetingId: config.subMeetingId || '__ROOT__',
            },
          },
          update: {
            ...config,
            updatedAt: new Date(),
          },
          create: config,
        });

        console.log(`✅ 创建/更新会议: ${meeting.title}`);
        return { meeting };
      }),
    );

    console.log(`📊 会议数据创建完成，共 ${meetings.length} 个会议`);
    return { meetings };
  } catch (error) {
    console.error('❌ 创建会议数据失败:', error);
    throw error;
  }
}
