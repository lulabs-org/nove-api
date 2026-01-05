/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-13 02:54:40
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-05 06:46:10
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/handlers/events/recording-completed.handler.ts
 * @Description: 录制完成事件处理器
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { BaseEventHandler } from '../base/base-event.handler';
import { RecordingCompletedPayload } from '../../types/tencent-event.types';
import { NumberRecordBitableRepository } from '@/integrations/lark/repositories';
import { OpenaiService } from '@/integrations/openai/openai.service';
import { RecordingContentService } from '../../services/recording-content.service';
import { TranscriptService } from '../../services/transcript.service';
import { MeetingBitableService } from '../../services/meeting-bitable.service';
import { MeetingParticipantService } from '../../services/meeting-participant.service';
import { SpeakerService } from '../../services/speaker.service';
import { MeetingRecordingRepository } from '../../repositories/meeting-recording.repository';
import { MeetingRepository } from '@/meeting/repositories/meeting.repository';
import { PARTICIPANT_SUMMARY_PROMPT } from '../../constants/prompts';
import { ParticipantSummaryRepository } from '../../repositories/participant-summary.repository';
import { MeetingSummaryRepository } from '../../repositories/meeting-summary.repository';
import { TranscriptBatchProcessor } from '../../services/transcript-batch-processor.service';
import { TranscriptRepository } from '../../repositories/transcript.repository';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import {
  NewSpeakerInfo,
  NewRecordingTranscriptParagraph,
} from '@/hook-tencent-mtg/types';
import {
  Prisma,
  MeetingRecording,
  RecordingSource,
  RecordingStatus,
  GenerationMethod,
  ProcessingStatus,
  MeetingPlatform,
} from '@prisma/client';

/**
 * 录制完成事件处理器
 */

@Injectable()
export class RecordingCompletedHandler extends BaseEventHandler {
  private readonly SUPPORTED_EVENT = 'recording.completed';

  constructor(
    private readonly numberRecordBitable: NumberRecordBitableRepository,
    private readonly openaiService: OpenaiService,
    private readonly recordingContentService: RecordingContentService,
    private readonly transcriptService: TranscriptService,
    private readonly bitableService: MeetingBitableService,
    private readonly participantService: MeetingParticipantService,
    private readonly speakerService: SpeakerService,
    private readonly meetingRecordingRepository: MeetingRecordingRepository,
    private readonly meetingRepository: MeetingRepository,
    private readonly participantSummaryRepository: ParticipantSummaryRepository,
    private readonly meetingSummaryRepository: MeetingSummaryRepository,
    private readonly transcriptRepository: TranscriptRepository,
    private readonly batchProcessor: TranscriptBatchProcessor,
    private readonly ptUserRepository: PlatformUserRepository,
  ) {
    super();
  }

  supports(event: string): boolean {
    return event === this.SUPPORTED_EVENT;
  }

  async handle(
    payload: RecordingCompletedPayload,
    index: number,
  ): Promise<void> {
    this.logEventProcessing(this.SUPPORTED_EVENT, payload, index);

    const { meeting_info, recording_files = [] } = payload;

    if (!meeting_info) {
      this.logger.warn('Missing required meeting_info in payload');
      return;
    }

    const { meeting_id, sub_meeting_id } = meeting_info;
    const creatorUserId = meeting_info.creator.userid || '';

    const { uniqueParticipants } =
      await this.participantService.getUniqueParticipants(
        meeting_id,
        creatorUserId,
        sub_meeting_id,
      );

    // 处理录制文件记录
    for (const file of recording_files) {
      const fileId = file.record_file_id;

      try {
        // 获取智能摘要、待办事项和会议纪要
        let fullsummary = '';
        let ai_minutes = '';
        let todo = '';
        // 获取录音转写内容
        let formattedText = '';
        let uniqueSpeakerInfos: NewSpeakerInfo[] = [];
        let paragraphs: NewRecordingTranscriptParagraph[] = [];

        const [meetingContentResult, transcriptResult] =
          await Promise.allSettled([
            this.recordingContentService.getMeetingContent(
              fileId,
              creatorUserId,
            ),
            this.transcriptService.getTranscript(fileId, creatorUserId),
          ]);

        // 处理会议内容结果
        if (meetingContentResult.status === 'fulfilled') {
          ({ fullsummary, todo, ai_minutes } = meetingContentResult.value);
        } else {
          this.logger.warn(`获取会议内容失败: ${fileId}`);
        }

        // 处理转写内容结果
        if (transcriptResult.status === 'fulfilled') {
          formattedText = transcriptResult.value.formattedText;
          uniqueSpeakerInfos = transcriptResult.value.uniqueSpeakerInfos;
          paragraphs = transcriptResult.value.paragraphs;

          // 扩展 speaker info 信息
          uniqueSpeakerInfos = await Promise.all(
            uniqueSpeakerInfos.map((speakerInfo) =>
              this.speakerService.enrichSpeakerInfo(
                speakerInfo,
                uniqueParticipants,
              ),
            ),
          );

          // 扩展 paragraphs 中的 speaker info
          paragraphs = await Promise.all(
            paragraphs.map(async (paragraph) => ({
              ...paragraph,
              speaker_info: await this.speakerService.enrichSpeakerInfo(
                paragraph.speaker_info,
                uniqueParticipants,
              ),
            })),
          );
        } else {
          this.logger.warn(`获取录音转写失败: ${fileId}`);
        }

        // 创建会议记录和录制文件记录
        const recordingRecordId =
          await this.bitableService.upsertRecordingFileRecord(
            fileId,
            meeting_info,
            fullsummary,
            todo,
            ai_minutes,
            uniqueSpeakerInfos.map((u) => u.username).join(','),
            formattedText,
          );

        const meeting = await this.meetingRepository.findByPtId(
          MeetingPlatform.TENCENT_MEETING,
          meeting_id,
          sub_meeting_id || '__ROOT__',
        );

        let recording: MeetingRecording | null = null;

        if (meeting) {
          this.logger.warn(
            `找到会议记录: ${meeting_id} ${sub_meeting_id || '__ROOT__'}`,
          );
          recording = await this.meetingRecordingRepository.upsert({
            meetingId: meeting.id,
            externalId: fileId,
            source: RecordingSource.PLATFORM_AUTO,
            status: RecordingStatus.COMPLETED,
            startAt: meeting.startAt || undefined,
            endAt: meeting.endAt || undefined,
          });

          await this.meetingSummaryRepository.upsert({
            meetingId: meeting.id,
            recordingId: recording.id,
            content: fullsummary,
            aiMinutes: ai_minutes ? { content: ai_minutes } : undefined,
            actionItems: todo ? { items: todo } : undefined,
            generatedBy: GenerationMethod.AI,
            aiModel: 'tencent-meeting-ai',
            status: ProcessingStatus.COMPLETED,
            language: 'zh-CN',
            version: 1,
            isLatest: true,
          });

          const existingTranscript =
            await this.transcriptRepository.findByRecordingId(recording.id);

          if (!existingTranscript) {
            const transcript = await this.transcriptRepository.create({
              source: `tencent-meeting:${fileId}`,
              rawJson: paragraphs as unknown as Prisma.InputJsonValue,
              status: 2,
              recordingId: recording.id,
            });

            await this.batchProcessor.processParagraphsInBatches(
              paragraphs,
              transcript.id,
            );
          } else {
            this.logger.log(`转写记录已存在，跳过处理: ${fileId}`);
          }
        }

        // 对参会者逐个进行会议总结

        for (const u of uniqueParticipants) {
          const uId = await this.bitableService.safeUpsertMeetingUserRecord(u);

          if (
            uniqueSpeakerInfos.find((uInfo) => uInfo.username === u.user_name)
          ) {
            // 构建参会者的会议总结提示词
            const participantSummaryPrompt = PARTICIPANT_SUMMARY_PROMPT(
              meeting_info.subject,
              new Date(meeting_info.start_time * 1000).toLocaleString(),
              new Date(meeting_info.end_time * 1000).toLocaleString(),
              u.user_name,
              ai_minutes || '暂无会议纪要',
              todo || '暂无待办事项',
              formattedText || '暂无录音转写',
            );

            // 调用OpenAI生成个性化总结
            const participantSummary = await this.openaiService.ask(
              participantSummaryPrompt,
              '你是专业的会议总结助手，擅长为参会者提供个性化、实用的会议总结。',
            );

            this.logger.log(`成功生成参会者: ${u.user_name}总结`);

            // 保存参会者总结到number_record表，填入记录id
            await this.numberRecordBitable.upsertNumberRecord({
              meet_participant: [uId],
              participant_summary: participantSummary,
              record_file: [recordingRecordId ?? ''],
            });
            this.logger.log(`参会者 ${u.user_name}总结记录已保存`);

            // 同步保存参会者总结到数据库
            if (meeting && recording) {
              const platformUser = await this.ptUserRepository.upsert(
                {
                  platform: MeetingPlatform.TENCENT_MEETING,
                  ptUnionId: u.uuid,
                },
                {
                  ptUserId: u.userid,
                  displayName: u.user_name,
                  phoneHash: u.phone,
                },
              );

              await this.participantSummaryRepository.upsert({
                periodType: 'SINGLE',
                platformUserId: platformUser.id,
                meetingId: meeting.id,
                meetingRecordingId: recording.id,
                userName: u.user_name,
                partSummary: participantSummary,
                generatedBy: GenerationMethod.AI,
                aiModel: 'tencent-meeting-ai',
                version: 1,
                isLatest: true,
              });
              this.logger.log(`参会者 ${u.user_name}总结已同步到数据库`);
            }
          }
        }
      } catch (error: unknown) {
        this.logger.error(
          `处理录制文件处理失败: ${file.record_file_id}`,
          error instanceof Error ? error.stack : undefined,
        );
        // 不抛出错误，避免影响主流程
      }
    }
  }
}
