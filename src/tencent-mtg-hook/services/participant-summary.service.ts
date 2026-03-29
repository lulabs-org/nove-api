/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-29 20:40:36
 * @FilePath: /nove_api/src/tencent-mtg-hook/services/participant-summary.service.ts
 * @Description: 参会者总结服务
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Platform } from '@prisma/client';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import { RecordingData } from '@/tencent-mtg-hook/types';
import { MeetingRepository } from '@/meeting/repositories/meeting.repository';
import { MeetingRecordingRepository } from '../repositories';
import { ParticipantSummaryService } from '@/meet-ai/services';

@Injectable()
export class TencentParticipantSummaryService {
  private readonly logger = new Logger(TencentParticipantSummaryService.name);

  constructor(
    private readonly ptUserRepo: PlatformUserRepository,
    private readonly recordingRepo: MeetingRecordingRepository,
    private readonly meetingRepo: MeetingRepository,
    private readonly participantSummaryService: ParticipantSummaryService,
  ) {}

  async processRecordingFiles(r: RecordingData): Promise<void> {
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
        const ptByUnionId = await this.ptUserRepo.findByUnionId(
          Platform.TENCENT_MEETING,
          u.uuid,
        );

        const recording = await this.recordingRepo.find(meeting.id, file.id);

        await this.participantSummaryService.generateAndSaveSummary(
          recording?.id || '',
          ptByUnionId?.id || '',
        );
      }
    }
  }
}
