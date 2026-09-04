/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-13 02:54:40
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-30 19:16:03
 * @FilePath: /nove_api/src/tencent-mtg/handlers/events/recording-completed.handler.ts
 * @Description: 录制完成事件处理器
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { BaseEventHandler } from '../base/base-event.handler';
import { RecordingCompletedPayload } from '../../types';
import {
  MeetingParticipantService,
  SpeakerService,
  TencentMtgMeetingCoreService,
  TencentMtgSummaryCoreService,
  TencentMtgTranscriptCoreService,
} from '../../services';
import { TranscriptRepository } from '@/minute/repositories';
import { ParticipantService } from '../../client';
import { ParticipantDetail } from '../../types';

/**
 * 录制完成事件处理器
 */

@Injectable()
export class RecordingCompletedHandler extends BaseEventHandler {
  private readonly SUPPORTED_EVENT = 'recording.completed';

  constructor(
    private readonly speakerSvc: SpeakerService,
    private readonly meetingCoreSvc: TencentMtgMeetingCoreService,
    private readonly summaryCoreSvc: TencentMtgSummaryCoreService,
    private readonly transcriptCoreSvc: TencentMtgTranscriptCoreService,
    private readonly participantSvc: MeetingParticipantService,
    private readonly tencentParticipantSvc: ParticipantService,
    private readonly transcriptRepo: TranscriptRepository,
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

    // 延迟 2 分钟：由于腾讯会议的录制转写完成 webhook 触发时，
    // 其接口的数据有时还处于最终落盘中，直接请求可能获取不到最完整的纪要/转写或参会人，
    // 因此这里特意延迟 120 秒，以保证后续接口调用能够拿到全量数据。
    await new Promise((resolve) => setTimeout(resolve, 120000));

    const { meeting_info, recording_files = [] } = payload;
    const { meeting_id, sub_meeting_id, creator } = meeting_info;

    if (!meeting_id || !creator.userid) {
      this.logger.warn('缺少必要参数: meetid 或 cid');
      return;
    }

    // 0. 优先获取本地 Meeting 记录（如果不存在则新建）
    // 这一步必须最先执行，因为后续的所有关联操作（记录行为、拉取转写、推飞书）
    // 都需要一个确定的本地 meeting.id 作为外键。
    const meeting = await this.meetingCoreSvc.upsertMeetingFromWebhook(
      payload,
      this.SUPPORTED_EVENT,
    );

    let uniqueParticipants: ParticipantDetail[] | undefined;
    let rawParticipants: ParticipantDetail[] | undefined;

    // 1. 提前向腾讯会议拉取本场会议的参会者明细
    // 我们需要这两份数据：
    // - deduplicated: 用于匹配说话人、生成个人总结以及绑定飞书记录。
    // - original: 保留了每次进出的时间戳，用于写入用户的行为日志 (JOIN/LEAVE)。
    try {
      const res = await this.tencentParticipantSvc.list(
        meeting_id,
        creator.userid,
        sub_meeting_id,
      );
      uniqueParticipants = res.deduplicated;
      rawParticipants = res.original;
      this.logger.log(`获取去重参会者成功: ${uniqueParticipants.length} 人`);
    } catch (error) {
      this.logger.error(
        `获取去重参会者失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!uniqueParticipants) {
      this.logger.warn('获取参会者列表失败');
      return;
    }

    // 先确保参会者在我们的用户表中存在，因为 syncParticipants 依赖于平台用户表
    await this.speakerSvc.syncPtUsers(uniqueParticipants);

    // 2. 基础数据同步：同步参会者行为与本地平台用户表
    // 将参会者的 JOIN/LEAVE 行为落库，并更新他们的总参会时长
    await this.participantSvc.syncParticipants(meeting, rawParticipants!);


    // 3. 循环处理每一个录音文件 (一场会议可能会被分段录制出多个文件)
    for (const file of recording_files) {
      if (!file.record_file_id) continue;

      // 3.1 确保录制文件本身在数据库中存在记录
      const recording = await this.meetingCoreSvc.upsertRecordingFromWebhook(
        meeting,
        file.record_file_id,
      );

      // 3.2 核心业务同步：从腾讯 API 拉取“智能摘要”和“待办事项”并入库
      await this.summaryCoreSvc.upsertSummaryFromApi(
        meeting.id,
        recording.id,
        file.record_file_id,
        creator.userid || '',
      );

      // 3.3 核心业务同步：从腾讯 API 拉取“完整逐字稿(Transcript)”
      // 这里会完成说话人的匹配，并将大段文本切分为数据库内的 segments。
      let shouldSync = true;
      let existingTranscriptId: string | undefined;

      const existingTranscript = await this.transcriptRepo.findByRecordingId(
        recording.id,
      );

      if (existingTranscript) {
        existingTranscriptId = existingTranscript.id;
        const segmentCount = await this.transcriptRepo.countSegments(
          existingTranscript.id,
        );
        if (segmentCount > 0) {
          shouldSync = false;
        }
      }

      if (shouldSync) {
        const paragraphs =
          await this.transcriptCoreSvc.fetchTranscriptParagraphs(
            file.record_file_id,
            creator.userid || '',
            uniqueParticipants,
            meeting_id,
          );

        if (paragraphs.length > 0) {
          const transcriptId =
            existingTranscriptId ||
            (await this.transcriptCoreSvc.createTranscript(
              recording.id,
              file.record_file_id,
            ));
          await this.transcriptCoreSvc.batchInsertSegments(
            paragraphs,
            transcriptId,
          );
        }
      }
    }
  }
}
