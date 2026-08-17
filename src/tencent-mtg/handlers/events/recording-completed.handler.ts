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
import {
  RecordingCompletedPayload,
  MeetingRecordingContext,
  RecordingDataFile,
} from '../../types';
import {
  MeetingParticipantService,
  MeetingBitableService,
  SpeakerService,
  RecordingDataFetcherService,
  SummaryService,
  MeetingDatabaseService,
} from '../../services';
import { ParticipantService } from '@/integrations/tencent-meeting/services';
import { ParticipantDetail } from '@/integrations/tencent-meeting/types';

/**
 * 录制完成事件处理器
 */

@Injectable()
export class RecordingCompletedHandler extends BaseEventHandler {
  private readonly SUPPORTED_EVENT = 'recording.completed';

  constructor(
    private readonly bitableService: MeetingBitableService,
    private readonly speakerSvc: SpeakerService,
    private readonly dataFetcher: RecordingDataFetcherService,
    private readonly databaseSvc: MeetingDatabaseService,
    private readonly summarySvc: SummaryService,
    private readonly participantSvc: MeetingParticipantService,
    private readonly tencentParticipantSvc: ParticipantService,
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

    await new Promise((resolve) => setTimeout(resolve, 120000));

    const { meeting_info, recording_files = [] } = payload;
    const { meeting_id, sub_meeting_id, creator } = meeting_info;

    if (!meeting_id || !creator.userid) {
      this.logger.warn('缺少必要参数: meetid 或 cid');
      return;
    }

    let uniqueParticipants: ParticipantDetail[] | undefined;
    let rawParticipants: ParticipantDetail[] | undefined;

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

    const processedFiles: RecordingDataFile[] = recording_files.map((file) => ({
      id: file.record_file_id,
    }));

    await this.dataFetcher.processFiles(
      processedFiles,
      creator.userid,
      meeting_id,
      uniqueParticipants,
    );

    const context: MeetingRecordingContext = {
      meetid: meeting_id,
      subject: meeting_info.subject || '',
      start_time: meeting_info.start_time || 0,
      end_time: meeting_info.end_time || 0,
      subid: sub_meeting_id,
      cid: creator.userid || '',
      uniqueParticipants: uniqueParticipants,
      rawParticipants: rawParticipants,
      recordingFiles: processedFiles,
    };

    if (!context.uniqueParticipants) {
      this.logger.warn('获取参会者列表失败');
      return;
    }

    await this.participantSvc.syncParticipants(context);
    await this.bitableService.safeUpsertMeetingUserRecords(
      context.uniqueParticipants,
    );
    await this.bitableService.upsertRecording(context);
    await this.speakerSvc.syncPtUsers(context.uniqueParticipants);
    await this.databaseSvc.upsertmeet(payload, this.SUPPORTED_EVENT);
    await this.databaseSvc.upsertRecording(context);
    await this.databaseSvc.upsertMeetingSummary(context);
    await this.databaseSvc.upsertTranscript(context);
    await this.summarySvc.processSummary(context);
  }
}
