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
import { formatToTimezone, formatTimeMs } from '@/common/utils/time.util';
import { extractUserName } from '@/common/utils/user.util';
import { LlmService } from '@/llm/llm.service';
import { PlatformUserService } from '@/user-platform/services/platform-user.service';
import { ParticipantSummaryRepository } from '../repositories';
import { GenerateParticipantSummaryDto } from '../dto/meet-ai.dto';
import { openaiConfig } from '@/configs/openai.config';
import { generatePrompt } from '@/common/utils';
import {
  MeetingRecordNotFoundException,
  MeetingSummaryNotFoundException,
  RecordingNotFoundException,
} from '@/meeting/exceptions/meeting.exceptions';

type SummarySegment = {
  startTimeMs: bigint;
  speakerName: string | null;
  text: string;
  speaker: { displayName: string | null } | null;
};

@Injectable()
export class ParticipantSummaryService {
  private readonly logger = new Logger(ParticipantSummaryService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly partSummaryRepo: ParticipantSummaryRepository,
    private readonly platformUserService: PlatformUserService,
    @Inject(openaiConfig.KEY)
    private readonly config: ConfigType<typeof openaiConfig>,
  ) {}

  async generateSummary({
    recordId,
    platformUserId,
  }: GenerateParticipantSummaryDto): Promise<string> {
    const { recording, meeting, platformUser, meetingSummary, transcript } =
      await this.fetchMeetingContext(recordId, platformUserId);

    const segments = this.formatSegments(transcript.segments);
    const userName = extractUserName(platformUser);

    const { systemPrompt, prompt } = generatePrompt('PARTICIPANT_SUMMARY', {
      userName,
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      startTime: formatToTimezone(meeting.startAt!, 8),
      endTime: formatToTimezone(meeting.endAt!, 8),
      minutes: meetingSummary.aiMinutes,
      keyPoints: meetingSummary.keyPoints,
      actionItems: meetingSummary.actionItems,
      decisions: meetingSummary.decisions,
      goldenQuotes: meetingSummary.goldenQuotes,
      keywords: meetingSummary.keywords?.join(', '),
      segments,
    });

    const summary = await this.llmService.ask(prompt, systemPrompt);

    await this.partSummaryRepo.saveNewVersion({
      periodType: PeriodType.SINGLE,
      platformUserId,
      meetingId: meeting.id,
      meetingRecordingId: recordId,
      userName: userName,
      partSummary: summary,
      generatedBy: GenerationMethod.AI,
      aiModel: this.config.model,
      periodStart: recording.startAt || meeting.startAt || undefined,
      periodEnd: recording.endAt || meeting.endAt || undefined,
    });

    this.logger.log(`成功生成参会者: ${userName}总结`);
    return summary;
  }

  private formatSegments(segments: SummarySegment[] = []) {
    return segments.map((segment) => {
      const timeStr = formatTimeMs(Number(segment.startTimeMs || 0));
      const speakerName =
        segment.speakerName || segment.speaker?.displayName || '未知发言人';
      const content = segment.text || '';
      return [timeStr, speakerName, content];
    });
  }

  private async fetchMeetingContext(
    recordingId: string,
    platformUserId: string,
  ) {
    const [recording, platformUser] = await Promise.all([
      this.partSummaryRepo.findGenerationContext(recordingId),
      this.platformUserService.findById(platformUserId),
    ]);

    if (!recording) {
      throw new RecordingNotFoundException(recordingId);
    }

    const meeting = recording.meeting;
    if (meeting.deletedAt) {
      throw new MeetingRecordNotFoundException(meeting.id);
    }

    const [meetingSummary] = meeting.summaries;
    if (!meetingSummary) {
      throw new MeetingSummaryNotFoundException(meeting.id);
    }

    const [transcript] = recording.transcripts;
    if (!transcript) {
      throw new NotFoundException(`转录记录不存在: ${recordingId}`);
    }

    return { recording, meeting, platformUser, meetingSummary, transcript };
  }
}
