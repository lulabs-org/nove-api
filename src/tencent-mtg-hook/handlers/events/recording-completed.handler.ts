/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-13 02:54:40
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-29 16:59:54
 * @FilePath: /nove_api/src/tencent-mtg-hook/handlers/events/recording-completed.handler.ts
 * @Description: 录制完成事件处理器
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import {
  Prisma,
  GenerationMethod,
  MeetingPlatform,
} from '@prisma/client';

import { BaseEventHandler } from '../base/base-event.handler';
import { RecordingCompletedPayload, RecordingData } from '../../types';
import {
  MeetingBitableService,
  SpeakerService,
  TranscriptBatchProcessor,
  RecordingDataFetcherService,
} from '../../services';
import {
  MeetingSummaryRepository,
  ParticipantSummaryRepository,
  TranscriptRepository,
} from '../../repositories';
import { PARTICIPANT_SUMMARY_PROMPT } from '../../constants/prompts';

import { NumberRecordBitableRepository } from '@/integrations/lark/repositories';
import { OpenaiService } from '@/integrations/openai/openai.service';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import { MeetingDatabaseService } from '../../services/meeting-database.service';

/**
 * 录制完成事件处理器
 */

@Injectable()
export class RecordingCompletedHandler extends BaseEventHandler {
  private readonly SUPPORTED_EVENT = 'recording.completed';

  constructor(
    private readonly batchProcessor: TranscriptBatchProcessor,
    private readonly numberRecordBitable: NumberRecordBitableRepository,
    private readonly openaiService: OpenaiService,
    private readonly bitableService: MeetingBitableService,
    private readonly speakerSvc: SpeakerService,
    private readonly dataFetcher: RecordingDataFetcherService,
    private readonly partSummaryRepo: ParticipantSummaryRepository,
    private readonly transcriptRepo: TranscriptRepository,
    private readonly ptUserRepo: PlatformUserRepository,
    private readonly meetingDatabaseSvc: MeetingDatabaseService,
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
    const { meeting_id, sub_meeting_id, creator } = meeting_info;

    let r: RecordingData = {};

    r.meetid = meeting_id;
    r.subject = meeting_info.subject || '';
    r.start_time = meeting_info.start_time || 0;
    r.end_time = meeting_info.end_time || 0;
    r.subid = sub_meeting_id;
    r.cid = creator.userid || '';
    r.files = recording_files.map((file) => ({
      id: file.record_file_id,
    }));

    r = await this.dataFetcher.fetch(r);

    if (!r.deduplicated) {
      this.logger.warn('获取参会者列表失败');
      return;
    }

    await this.speakerSvc.syncPtUsers(r.deduplicated);
    const recordIds = await this.bitableService.upsertRecording(r);

    const meeting = await this.meetingDatabaseSvc.upsert(
      payload,
      this.SUPPORTED_EVENT,
    );

    const recordings = await this.meetingDatabaseSvc.upsertRecording(r);

    await this.meetingDatabaseSvc.upsertMeetingSummary(meeting, recording, file);

    // 处理录制文件记录
    for (let index = 0; index < (r.files?.length || 0); index++) {
      const file = r.files![index];
      const recording = recordings[index];
      try {
        if (!recording) {
          this.logger.warn(`录制记录不存在: ${file.id}`);
          continue;
        }


        const transcript = await this.transcriptRepo.findByRecordingId(
          recording.id,
        );

        if (!transcript) {
          const res = await this.transcriptRepo.create({
            source: `tencent-meeting:${file.id}`,
            rawJson: file.paragraphs as unknown as Prisma.InputJsonValue,
            status: 2,
            recordingId: recording.id,
          });

          await this.batchProcessor.processParagraphsInBatches(
            file.paragraphs || [],
            res.id,
          );
        } else {
          this.logger.log(`转写记录已存在，跳过处理: ${file.id}`);
        }

        // 对参会者逐个进行会议总结
        for (const u of r.deduplicated) {
          const uId = await this.bitableService.safeUpsertMeetingUserRecord(u);

          if (
            file.speakerlist?.find((uInfo) => uInfo.username === u.user_name)
          ) {
            // 构建参会者的会议总结提示词
            const prompt = PARTICIPANT_SUMMARY_PROMPT(
              meeting_info.subject,
              new Date(meeting_info.start_time * 1000).toLocaleString(),
              new Date(meeting_info.end_time * 1000).toLocaleString(),
              u.user_name,
              file.aiminutes || '暂无会议纪要',
              file.todo || '暂无待办事项',
              file.formattedtext || '暂无录音转写',
            );

            const systemPrompt =
              '你是专业的会议总结助手，擅长为参会者提供个性化、实用的会议总结。';

            // 调用OpenAI生成个性化总结
            const summary = await this.openaiService.ask(prompt, systemPrompt);

            this.logger.log(`成功生成参会者: ${u.user_name}总结`);

            // 保存参会者总结到number_record表，填入记录id
            await this.numberRecordBitable.upsertNumberRecord({
              meet_participant: [uId],
              participant_summary: summary,
              record_file: [recordIds[index] ?? ''],
            });
            this.logger.log(`参会者 ${u.user_name}总结记录已保存`);

            // 同步保存参会者总结到数据库
            if (meeting && recording) {
              const platformUser = await this.ptUserRepo.upsert(
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

              await this.partSummaryRepo.upsert({
                periodType: 'SINGLE',
                platformUserId: platformUser.id,
                meetingId: meeting.id,
                meetingRecordingId: recording.id,
                userName: u.user_name,
                partSummary: summary,
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
          `处理录制文件处理失败: ${file.id}`,
          error instanceof Error ? error.stack : undefined,
        );
        // 不抛出错误，避免影响主流程
      }
    }
  }
}
