/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-29 19:42:58
 * @FilePath: /nove_api/src/tencent-mtg-hook/services/participant-summary.service.ts
 * @Description: 参会者总结服务
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import { GenerationMethod, Platform } from '@prisma/client';
import { OpenaiService } from '@/integrations/openai/openai.service';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import { RecordingData } from '@/tencent-mtg-hook/types';
import { MeetingRepository } from '@/meeting/repositories/meeting.repository';
import {
  ParticipantSummaryRepository,
  MeetingRecordingRepository,
  MeetingSummaryRepository,
  TranscriptRepository,
} from '../repositories';

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

  async generateAndSaveSummary(
    recordid: string,
    ptByUnionId: string,
  ): Promise<void> {
    const recording = await this.recordingRepo.findById(recordid);
    if (!recording) {
      this.logger.warn(`录制记录不存在: ${recordid}`);
      return;
    }

    const meeting = await this.meetingRepo.findById(recording.meetingId);
    if (!meeting) {
      this.logger.warn(`会议记录不存在: ${recording.meetingId}`);
      return;
    }

    const platformUser = await this.ptUserRepo.findById(ptByUnionId);
    if (!platformUser) {
      this.logger.warn(`平台用户不存在: ${ptByUnionId}`);
      return;
    }

    const meetingSummary = await this.meetingSummaryRepo.findByMeetingId(
      meeting.id,
    );
    if (!meetingSummary) {
      this.logger.warn(`会议总结不存在: ${meeting.id}`);
      return;
    }

    const user = platformUser.user;
    const profile = user?.profile;
    const userName =
      profile?.displayName ||
      profile?.firstName ||
      platformUser.displayName ||
      '未知用户';

    const transcript = await this.transcriptRepo.findById(recording.id);
    let transcriptText = '暂无转写记录';
    if (transcript && transcript.paragraphs) {
      transcriptText = transcript.paragraphs
        .map((p) => {
          const speakerName = p.speaker?.displayName || p.speaker?.firstName || '未知发言人';
          const paragraphText = p.sentences
            .map((s) => s.text)
            .filter(Boolean)
            .join(' ');
          return `[${speakerName}]: ${paragraphText}`;
        })
        .join('\n');
    }

    const systemPrompt =
      '你是专业的会议总结助手，擅长为参会者提供个性化、实用的会议总结。';

    const prompt = `请为参会者 ${userName} 生成会议总结。
会议主题: ${meeting.title}
会议时间: ${meeting.startAt} 至 ${meeting.endAt}
会议纪要: ${meetingSummary.aiMinutes ? JSON.stringify(meetingSummary.aiMinutes) : '暂无会议纪要'}
关键要点: ${meetingSummary.keyPoints ? JSON.stringify(meetingSummary.keyPoints) : '暂无关键要点'}
行动项: ${meetingSummary.actionItems ? JSON.stringify(meetingSummary.actionItems) : '暂无行动项'}
决策记录: ${meetingSummary.decisions ? JSON.stringify(meetingSummary.decisions) : '暂无决策记录'}
会议金句: ${meetingSummary.goldenQuotes ? JSON.stringify(meetingSummary.goldenQuotes) : '暂无会议金句'}
关键词: ${meetingSummary.keywords?.join(', ') || '暂无关键词'}

会议转写记录:
${transcriptText}

请根据以上信息，为参会者 ${userName} 生成一份个性化的会议总结，重点关注与该参会者相关的内容。`;

    const summary = await this.openaiService.ask(prompt, systemPrompt);

    // await this.numberRecordBitable.upsertNumberRecord({
    //   meet_participant: [recordId],
    //   participant_summary: summary,
    //   record_file: [recordId],
    // });
    // this.logger.log(`参会者 ${u.user_name}总结记录已保存`);

    await this.partSummaryRepo.upsert({
      periodType: 'SINGLE',
      platformUserId: ptByUnionId,
      meetingId: meeting.id,
      recordingId: recordid,
      userName: userName,
      partSummary: summary,
      generatedBy: GenerationMethod.AI,
      aiModel: 'tencent-meeting-ai',
      version: 1,
      isLatest: true,
    });

    this.logger.log(`成功生成参会者: ${userName}总结`);
  }

  async processRecordingFiles(r: RecordingData): Promise<void> {
    const meeting = await this.meetingRepo.findByPt(
      Platform.TENCENT_MEETING,
      r.meetid || '',
      r.subid || '__ROOT__',
    );

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    for (let index = 0; index < (r.files?.length || 0); index++) {
      const file = r.files![index];

      for (const u of r.deduplicated || []) {
        const ptByUnionId = await this.ptUserRepo.findByUnionId(
          Platform.TENCENT_MEETING,
          u.uuid,
        );

        const recording = await this.recordingRepo.find(meeting.id, file.id);

        await this.generateAndSaveSummary(
          recording?.id || '',
          ptByUnionId?.id || '',
        );
      }
    }
  }
}
