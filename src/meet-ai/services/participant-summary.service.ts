/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29 20:34:53
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-30 04:05:33
 * @FilePath: /nove_api/src/meet-ai/services/participant-summary.service.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import { GenerationMethod, PeriodType } from '@prisma/client';
import { OpenaiService } from '@/integrations/openai/openai.service';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import { MeetingRepository } from '@/meeting/repositories/meeting.repository';
import { ParticipantSummaryRepository } from '../repositories';
import {
  MeetingRecordingRepository,
  MeetingSummaryRepository,
  TranscriptRepository,
} from '@/meeting/repositories';
import { formatToBeijingTime } from '@/common/utils/time.util';

@Injectable()
export class ParticipantSummaryService {
  private readonly logger = new Logger(ParticipantSummaryService.name);

  constructor(
    private readonly openaiService: OpenaiService,
    private readonly partSummaryRepo: ParticipantSummaryRepository,
    private readonly ptUserRepo: PlatformUserRepository,
    private readonly recordingRepo: MeetingRecordingRepository,
    private readonly meetingRepo: MeetingRepository,
    private readonly meetingSummaryRepo: MeetingSummaryRepository,
    private readonly transcriptRepo: TranscriptRepository,
  ) {}

  async generateSummary(
    recordid: string,
    ptByUnionId: string,
  ): Promise<string | null> {
    const recording = await this.recordingRepo.findById(recordid);
    if (!recording) {
      this.logger.warn(`录制记录不存在: ${recordid}`);
      return null;
    }

    const meeting = await this.meetingRepo.findById(recording.meetingId);
    if (!meeting) {
      this.logger.warn(`会议记录不存在: ${recording.meetingId}`);
      return null;
    }

    const platformUser = await this.ptUserRepo.findById(ptByUnionId);
    if (!platformUser) {
      this.logger.warn(`平台用户不存在: ${ptByUnionId}`);
      return null;
    }

    const meetingSummary = await this.meetingSummaryRepo.findByMeetingId(
      meeting.id,
    );
    if (!meetingSummary) {
      this.logger.warn(`会议总结不存在: ${meeting.id}`);
      return null;
    }

    const transcript = await this.transcriptRepo.findDetails(recordid);
    if (!transcript) {
      this.logger.warn(`转录记录不存在: ${recordid}`);
      return null;
    }

    const paragraphs = transcript.paragraphs.map((paragraph) => {
      const timeMs = Number(paragraph.startTimeMs);
      const hours = Math.floor(timeMs / 3600000);
      const minutes = Math.floor((timeMs % 3600000) / 60000);
      const seconds = Math.floor((timeMs % 60000) / 1000);

      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      const speakerName = paragraph.speaker?.displayName || '未知发言人';

      const content = paragraph.sentences
        .map((sentence) => sentence.text || '')
        .filter((text) => text)
        .join('');

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

    const systemPrompt =
      '你是专业的会议总结助手，擅长为参会者提供个性化、实用的会议总结。';

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
会议转录内容: ${JSON.stringify(paragraphs)}\n
请根据以上信息，为参会者 ${userName} 生成一份个性化的会议总结，重点关注与该参会者相关的内容。`;

    const summary = await this.openaiService.ask(prompt, systemPrompt);

    const res = await this.partSummaryRepo.findByPeriodAndMeeting({
      periodType: PeriodType.SINGLE,
      platformUserId: ptByUnionId,
      meetingId: meeting.id,
      recordingId: recordid,
      isLatest: true,
    });

    if (res) {
      this.logger.warn(`参会者: ${userName} 已存在总结`);

      await this.partSummaryRepo.update(res.id, {
        isLatest: false,
      });

      await this.partSummaryRepo.create({
        periodType: PeriodType.SINGLE,
        platformUserId: ptByUnionId,
        meetingId: meeting.id,
        recordingId: recordid,
        userName: userName,
        partSummary: summary,
        generatedBy: GenerationMethod.AI,
        aiModel: 'deepseek-v3-1-terminus',
        version: res.version + 1,
        isLatest: true,
        period_start: recording.startAt || meeting.startAt || undefined,
        period_end: recording.endAt || meeting.endAt || undefined,
      });
      return summary;
    }

    await this.partSummaryRepo.upsert({
      periodType: PeriodType.SINGLE,
      platformUserId: ptByUnionId,
      meetingId: meeting.id,
      recordingId: recordid,
      userName: userName,
      partSummary: summary,
      generatedBy: GenerationMethod.AI,
      aiModel: 'deepseek-v3-1-terminus',
      version: 1,
      isLatest: true,
      period_start: recording.startAt || meeting.startAt || undefined,
      period_end: recording.endAt || meeting.endAt || undefined,
    });

    this.logger.log(`成功生成参会者: ${userName}总结`);
    return summary;
  }
}
