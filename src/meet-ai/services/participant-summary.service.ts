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
import { LlmService } from '@/llm/llm.service';
import { ParticipantSummaryRepository } from '../repositories';
import { GenerateParticipantSummaryDto } from '../dto/meet-ai.dto';
import { SummarySegment } from '../types';
import { openaiConfig } from '@/configs/openai.config';
import { generatePrompt } from '@/common/utils';
import {
  MeetingRecordNotFoundException,
  MeetingSummaryNotFoundException,
  RecordingNotFoundException,
} from '@/meeting/exceptions/meeting.exceptions';

@Injectable()
export class ParticipantSummaryService {
  private readonly logger = new Logger(ParticipantSummaryService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly partSummaryRepo: ParticipantSummaryRepository,
    @Inject(openaiConfig.KEY)
    private readonly config: ConfigType<typeof openaiConfig>,
  ) {}

  async generateSummaries({
    recordId,
    platformUserIds,
  }: GenerateParticipantSummaryDto): Promise<Record<string, string>> {
    // 1. 获取全局上下文数据
    const context = await this.fetchMeetingContext(recordId);
    const { transcript } = context;

    let userIdsToProcess = platformUserIds;
    if (!userIdsToProcess || userIdsToProcess.length === 0) {
      userIdsToProcess = [
        ...new Set(
          transcript.segments
            .map((s) => s.speaker?.id)
            .filter((id): id is string => id != null),
        ),
      ];
    }

    if (userIdsToProcess.length === 0) {
      this.logger.warn(`录制 ${recordId} 未检测到任何发言人，无法生成总结`);
      return {};
    }

    this.logger.log(`需生成总结的发言人数: ${userIdsToProcess.length}`);

    const results: Record<string, string> = {};

    for (const userId of userIdsToProcess) {
      try {
        const summary = await this.generateUserSummary(
          userId,
          recordId,
          context,
        );
        if (summary) {
          results[userId] = summary;
        }
      } catch (err) {
        this.logger.error(
          `生成参会者 ${userId} 总结失败`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }

    return results;
  }

  private async generateUserSummary(
    platformUserId: string,
    recordId: string,
    context: Awaited<ReturnType<typeof this.fetchMeetingContext>>,
  ): Promise<string> {
    const { recording, meeting, meetingSummary, transcript } = context;

    // 2. 校验参会者发言记录并获取姓名
    const userName = this.getParticipantName(
      transcript.segments,
      platformUserId,
    );
    if (!userName) return '';

    // 3. 提取并格式化专属上下文片段 (带语境窗口)
    const relevantSegments = this.extractUserContextSegments(
      transcript.segments,
      platformUserId,
      3,
    );
    const segments = this.formatSegments(relevantSegments);

    // 4. 构建大模型 Prompt
    const periodStart = recording.startAt ?? meeting.startAt;
    const periodEnd = recording.endAt ?? meeting.endAt;
    const { systemPrompt, prompt } = generatePrompt('PARTICIPANT_SUMMARY', {
      userName,
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      startTime: periodStart ? formatToTimezone(periodStart, 8) : '未知',
      endTime: periodEnd ? formatToTimezone(periodEnd, 8) : '未知',
      minutes: meetingSummary.aiMinutes,
      keyPoints: meetingSummary.keyPoints,
      actionItems: meetingSummary.actionItems,
      decisions: meetingSummary.decisions,
      goldenQuotes: meetingSummary.goldenQuotes,
      keywords: meetingSummary.keywords?.join(', '),
      segments,
    });

    // 5. 调用大模型生成总结
    const summary = await this.llmService.ask(prompt, systemPrompt);

    // 6. 结果持久化
    await this.partSummaryRepo.saveNewVersion({
      periodType: PeriodType.SINGLE,
      platformUserId,
      meetingId: meeting.id,
      meetingRecordingId: recordId,
      userName,
      partSummary: summary,
      generatedBy: GenerationMethod.AI,
      aiModel: this.config.model,
      periodStart,
      periodEnd,
    });

    this.logger.log(`成功生成参会者: ${userName}总结`);
    return summary;
  }

  private getParticipantName(
    segments: SummarySegment[],
    platformUserId: string,
  ): string | null {
    const spokenSegment = segments.find(
      (segment) => segment.speaker?.id === platformUserId,
    );

    if (!spokenSegment) {
      this.logger.log(`参会者 ${platformUserId} 未参与发言，无需生成总结`);
      return null;
    }

    const userName = spokenSegment.speakerName;
    if (!userName) {
      this.logger.warn(`无法获取参会者 ${platformUserId} 的姓名，无法生成总结`);
      return null;
    }

    return userName;
  }

  private extractUserContextSegments(
    segments: SummarySegment[],
    targetUserId: string,
    contextSize: number = 2,
  ): SummarySegment[] {
    const includedIndices = new Set<number>();

    segments.forEach((segment, index) => {
      if (segment.speaker?.id === targetUserId) {
        const start = Math.max(0, index - contextSize);
        const end = Math.min(segments.length - 1, index + contextSize);
        for (let i = start; i <= end; i++) {
          includedIndices.add(i);
        }
      }
    });

    return Array.from(includedIndices)
      .sort((a, b) => a - b)
      .map((index) => segments[index]);
  }

  private formatSegments(segments: SummarySegment[] = []) {
    return segments.map((segment) => [
      formatTimeMs(Number(segment.startTimeMs || 0)),
      segment.speakerName || segment.speaker?.displayName || '未知发言人',
      segment.text || '',
    ]);
  }

  private async fetchMeetingContext(recordingId: string) {
    const recording =
      await this.partSummaryRepo.findGenerationContext(recordingId);
    if (!recording) throw new RecordingNotFoundException(recordingId);

    const meeting = recording.meeting;
    const transcript = recording.transcripts[0];
    const meetingSummary = meeting.summaries[0];

    if (meeting.deletedAt) throw new MeetingRecordNotFoundException(meeting.id);
    if (!meetingSummary) throw new MeetingSummaryNotFoundException(meeting.id);
    if (!transcript)
      throw new NotFoundException(`转录记录不存在: ${recordingId}`);

    return { recording, meeting, meetingSummary, transcript };
  }
}
