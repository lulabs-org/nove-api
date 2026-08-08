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

import { Injectable, Logger, Inject } from '@nestjs/common';
import { GenerationMethod, PeriodType } from '@prisma/client';
import { ConfigType } from '@nestjs/config';
import { formatToBeijingTime, formatTimeMs } from '@/common/utils/time.util';
import { extractUserName } from '@/common/utils/user.util';
import { LlmService } from '@/llm/llm.service';
import { PlatformUserService } from '@/user-platform/services/platform-user.service';
import { MeetingService } from '@/meeting/services/meeting.service';
import { MeetingRecordingService } from '@/meeting/services/meeting-recording.service';
import { MeetingSummaryService } from '@/meeting/services/meeting-summary.service';
import { TranscriptService } from '@/meeting/services/transcript.service';
import { ParticipantSummaryRepository } from '../repositories';
import { openaiConfig } from '@/configs/openai.config';
import { generatePrompt } from '@/common/utils';

@Injectable()
export class ParticipantSummaryService {
  private readonly logger = new Logger(ParticipantSummaryService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly partSummaryRepo: ParticipantSummaryRepository,
    private readonly platformUserService: PlatformUserService,
    private readonly meetingService: MeetingService,
    private readonly meetingRecordingService: MeetingRecordingService,
    private readonly meetingSummaryService: MeetingSummaryService,
    private readonly transcriptService: TranscriptService,
    @Inject(openaiConfig.KEY)
    private readonly config: ConfigType<typeof openaiConfig>,
  ) { }

  async generateSummary(
    recordid: string,
    ptByUnionId: string,
  ): Promise<string> {
    const { recording, meeting, platformUser, meetingSummary, transcript } =
      await this.fetchMeetingContext(recordid, ptByUnionId);

    const segments = this.formatSegments(transcript.segments);
    const userName = extractUserName(platformUser);

    const { systemPrompt, prompt } =
      generatePrompt('PARTICIPANT_SUMMARY', {
        userName,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        startTime: formatToBeijingTime(meeting.startAt),
        endTime: formatToBeijingTime(meeting.endAt),
        meetingSummaryMinutes: meetingSummary.aiMinutes,
        meetingSummaryKeyPoints: meetingSummary.keyPoints,
        meetingSummaryActionItems: meetingSummary.actionItems,
        meetingSummaryDecisions: meetingSummary.decisions,
        meetingSummaryGoldenQuotes: meetingSummary.goldenQuotes,
        meetingSummaryKeywords: meetingSummary.keywords?.join(', '),
        segments,
      });

    const summary = await this.llmService.ask(prompt, systemPrompt);

    await this.partSummaryRepo.saveNewVersion({
      periodType: PeriodType.SINGLE,
      platformUserId: ptByUnionId,
      meetingId: meeting.id,
      meetingRecordingId: recordid,
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

  private formatSegments(segments: any[] = []) {
    return segments.map((segment: any) => {
      const timeStr = formatTimeMs(Number(segment.startTimeMs || 0));
      const speakerName = segment.speakerName || segment.speaker?.displayName || '未知发言人';
      const content = segment.text || '';
      return [timeStr, speakerName, content];
    });
  }

  private async fetchMeetingContext(recordid: string, ptByUnionId: string) {
    const [recording, transcript, platformUser] = await Promise.all([
      this.meetingRecordingService.getById(recordid),
      this.transcriptService.getDetails(recordid),
      this.platformUserService.findById(ptByUnionId),
    ]);

    const meeting = await this.meetingService.findById(recording.meetingId);
    const meetingSummary = await this.meetingSummaryService.getByMeetingId(meeting.id);

    return { recording, meeting, platformUser, meetingSummary, transcript };
  }
}
