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

import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { GenerationMethod, PeriodType } from '@prisma/client';
import { ConfigType } from '@nestjs/config';
import { LlmService } from '@/llm/llm.service';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import { MeetingRepository } from '@/meeting/repositories/meeting.repository';
import { ParticipantSummaryRepository } from '../repositories';
import {
  MeetingRecordingRepository,
  MeetingSummaryRepository,
  TranscriptRepository,
} from '@/meeting/repositories';
import { formatToBeijingTime } from '@/common/utils/time.util';
import { openaiConfig } from '@/configs/openai.config';
import { MeetAiPromptService } from './meet-ai-prompt.service';

@Injectable()
export class ParticipantSummaryService {
  private readonly logger = new Logger(ParticipantSummaryService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly partSummaryRepo: ParticipantSummaryRepository,
    private readonly ptUserRepo: PlatformUserRepository,
    private readonly recordingRepo: MeetingRecordingRepository,
    private readonly meetingRepo: MeetingRepository,
    private readonly meetingSummaryRepo: MeetingSummaryRepository,
    private readonly transcriptRepo: TranscriptRepository,
    private readonly promptService: MeetAiPromptService,
    @Inject(openaiConfig.KEY)
    private readonly config: ConfigType<typeof openaiConfig>,
  ) {}

  async generateSummary(recordid: string, ptByUnionId: string): Promise<string> {
    const { recording, meeting, platformUser, meetingSummary, transcript } =
      await this.fetchMeetingContext(recordid, ptByUnionId);

    const { systemPrompt, prompt, userName } = this.promptService.buildParticipantSummary(
      meeting,
      meetingSummary,
      transcript,
      platformUser,
    );

    const summary = await this.llmService.ask(prompt, systemPrompt);

    await this.saveSummary(
      ptByUnionId,
      recordid,
      meeting,
      recording,
      userName,
      summary,
    );

    this.logger.log(`成功生成参会者: ${userName}总结`);
    return summary;
  }

  private async fetchMeetingContext(recordid: string, ptByUnionId: string) {
    const recording = await this.recordingRepo.findById(recordid);
    if (!recording) throw new NotFoundException(`录制记录不存在: ${recordid}`);

    const meeting = await this.meetingRepo.findById(recording.meetingId);
    if (!meeting) throw new NotFoundException(`会议记录不存在: ${recording.meetingId}`);

    const platformUser = await this.ptUserRepo.findById(ptByUnionId);
    if (!platformUser) throw new NotFoundException(`平台用户不存在: ${ptByUnionId}`);

    const meetingSummary = await this.meetingSummaryRepo.findByMeetingId(meeting.id);
    if (!meetingSummary) throw new NotFoundException(`会议总结不存在: ${meeting.id}`);

    const transcript = await this.transcriptRepo.findDetails(recordid);
    if (!transcript) throw new NotFoundException(`转录记录不存在: ${recordid}`);

    return { recording, meeting, platformUser, meetingSummary, transcript };
  }



  private async saveSummary(
    ptByUnionId: string,
    recordid: string,
    meeting: any,
    recording: any,
    userName: string,
    summary: string,
  ) {
    const res = await this.partSummaryRepo.findLatestSummary({
      periodType: PeriodType.SINGLE,
      platformUserId: ptByUnionId,
      meetingId: meeting.id,
      meetingRecordingId: recordid,
      isLatest: true,
    });

    if (res) {
      this.logger.warn(`参会者: ${userName} 已存在最新总结，将弃用旧版本并创建新版本`);
      await this.partSummaryRepo.update(res.id, { isLatest: false });
    }

    await this.partSummaryRepo.create({
      periodType: PeriodType.SINGLE,
      platformUserId: ptByUnionId,
      meetingId: meeting.id,
      meetingRecordingId: recordid,
      userName: userName,
      partSummary: summary,
      generatedBy: GenerationMethod.AI,
      aiModel: this.config.model,
      version: res ? res.version + 1 : 1,
      isLatest: true,
      periodStart: recording.startAt || meeting.startAt || undefined,
      periodEnd: recording.endAt || meeting.endAt || undefined,
    });
  }
}
