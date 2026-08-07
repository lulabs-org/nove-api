import { Injectable } from '@nestjs/common';
import { PeriodType } from '@prisma/client';
import { formatToBeijingTime } from '@/common/utils/time.util';

@Injectable()
export class MeetAiPromptService {
  buildParticipantSummaryPrompt(
    meeting: any,
    meetingSummary: any,
    transcript: any,
    platformUser: any,
  ) {
    const segments = transcript.segments.map((segment: any) => {
      const timeMs = Number(segment.startTimeMs);
      const hours = Math.floor(timeMs / 3600000);
      const minutes = Math.floor((timeMs % 3600000) / 60000);
      const seconds = Math.floor((timeMs % 60000) / 1000);

      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      const speakerName = segment.speakerName || segment.speaker?.displayName || '未知发言人';
      const content = segment.text || '';

      return [timeStr, speakerName, content];
    });

    const user = platformUser.user;
    const profile = user?.profile;
    const userName =
      platformUser.displayName ||
      profile?.displayName ||
      user?.username ||
      (profile?.lastName || '') + (profile?.firstName || '') ||
      '未知用户';

    const systemPrompt = '你是专业的会议总结助手，擅长为参会者提供个性化、实用的会议总结。';

    const prompt = `请为参会者 ${userName} 生成会议总结。
需要总结的参会者姓名: ${userName}\n
会议ID: ${meeting.id}\n
会议主题: ${meeting.title}\n
会议时间（北京时间）: ${formatToBeijingTime(meeting.startAt)} 至 ${formatToBeijingTime(meeting.endAt)}\n
会议纪要: ${meetingSummary.aiMinutes ? JSON.stringify(meetingSummary.aiMinutes) : '暂无会议纪要'}\n
关键要点: ${meetingSummary.keyPoints ? JSON.stringify(meetingSummary.keyPoints) : '暂无关键要点'}\n
行动项: ${meetingSummary.actionItems ? JSON.stringify(meetingSummary.actionItems) : '暂无行动项'}\n
决策记录: ${meetingSummary.decisions ? JSON.stringify(meetingSummary.decisions) : '暂无决策记录'}\n
会议金句: ${meetingSummary.goldenQuotes ? JSON.stringify(meetingSummary.goldenQuotes) : '暂无会议金句'}\n
关键词: ${meetingSummary.keywords?.join(', ') || '暂无关键词'}\n
会议转录格式：[时间戳, 说话人姓名, 内容]\n
会议转录内容: ${JSON.stringify(segments)}\n
请根据以上信息，为参会者 ${userName} 生成一份个性化的会议总结，重点关注与该参会者相关的内容。`;

    return { systemPrompt, prompt, userName };
  }

  buildPeriodSummaryPrompt(
    userName: string, 
    ctx: { parent: PeriodType; label: string }, 
    userSummaries: any[]
  ) {
    const systemPrompt = `
      你是人工智能助手，需要总结用户"${userName}"${ctx.label} 的会议记录。
      字段说明：
      - userName: 参会人在 onstage会议的昵称
      - partSummary: 参会人 onstage会议的总结
      - periodStart: 会议总结的开始区间
      - periodEnd: 会议总结的结束区间

      切记以上只是字段解释，不是输出内容。
      你只需要根据用户输入，总结用户在会议中的活动，输出 markdown 格式的总结。
    `.trim();

    // 优化上下文大小：只传递必要字段，剔除无用的元数据
    const leanSummaries = userSummaries.map(s => ({
      userName: s.userName,
      partSummary: s.partSummary,
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
    }));
    const prompt = JSON.stringify(leanSummaries);
    
    return { systemPrompt, prompt };
  }
}
