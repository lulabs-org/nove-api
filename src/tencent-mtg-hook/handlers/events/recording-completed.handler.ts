/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-13 02:54:40
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-30 03:54:22
 * @FilePath: /nove_api/src/tencent-mtg-hook/handlers/events/recording-completed.handler.ts
 * @Description: 录制完成事件处理器
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { BaseEventHandler } from '../base/base-event.handler';
import { RecordingCompletedPayload, RecordingData } from '../../types';
import {
  MeetingBitableService,
  SpeakerService,
  RecordingDataFetcherService,
  SummaryService,
} from '../../services';
import { MeetingDatabaseService } from '../../services/meeting-database.service';

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
    await this.bitableService.safeUpsertMeetingUserRecords(r.deduplicated);
    await this.bitableService.upsertRecording(r);
    await this.databaseSvc.upsert(payload, this.SUPPORTED_EVENT);
    await this.databaseSvc.upsertRecording(r);
    await this.databaseSvc.upsertMeetingSummary(r);
    await this.databaseSvc.upsertTranscript(r);
    await this.summarySvc.processSummary(r);
  }
}
