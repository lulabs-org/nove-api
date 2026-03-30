/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-30 05:09:43
 * @FilePath: /nove_api/src/tencent-mtg-hook/services/summary.service.ts
 * @Description: 参会者总结服务
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Platform } from '@prisma/client';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import { RecordingData } from '@/tencent-mtg-hook/types';
import { MeetingRepository } from '@/meeting/repositories/meeting.repository';
import { MeetingRecordingRepository } from '@/meeting/repositories';
import { ParticipantSummaryService } from '@/meet-ai/services';
import { MeetingBitableService } from '../services';
import {
  NumberRecordBitableRepository,
  RecordingFileBitableRepository,
} from '@/integrations/lark/repositories';

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(
    private readonly ptUserRepo: PlatformUserRepository,
    private readonly recordingRepo: MeetingRecordingRepository,
    private readonly meetingRepo: MeetingRepository,
    private readonly participantSummarySvc: ParticipantSummaryService,
    private readonly bitableService: MeetingBitableService,
    private readonly numberRecordBitable: NumberRecordBitableRepository,
    private readonly recordingFileBitable: RecordingFileBitableRepository,
  ) {}

  async processSummary(r: RecordingData): Promise<void> {
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
        if (file.speakerlist?.find((uInfo) => uInfo.username === u.user_name)) {
          const ptByUnionId = await this.ptUserRepo.findByUnionId(
            Platform.TENCENT_MEETING,
            u.uuid,
          );

          const recording = await this.recordingRepo.find(meeting.id, file.id);

          const summary = await this.participantSummarySvc.generateSummary(
            recording?.id || '',
            ptByUnionId?.id || '',
          );

          const uId = await this.bitableService.safeUpsertMeetingUserRecord(u);
          const recordingFile =
            await this.recordingFileBitable.searchRecordingFileById(file.id);

          const rid = recordingFile.data?.items?.[0]?.record_id || '';

          // 保存参会者总结到number_record表，填入记录id
          await this.numberRecordBitable.upsertNumberRecord({
            meet_participant: [uId],
            participant_summary: summary || '',
            record_file: [rid],
          });
        }
      }
    }
  }
}
