/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-30 05:09:43
 * @FilePath: /nove_api/src/tencent-mtg/services/summary.service.ts
 * @Description: 参会者总结服务
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Platform } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import { ParticipantDetail } from '@/integrations/tencent-meeting/types';
import { ParticipantSummaryService } from '@/meeting/services';
import { MeetingBitableService } from './meeting-bitable.service';
import {
  NumberRecordBitableRepository,
  RecordingFileBitableRepository,
} from '@/integrations/lark/repositories';

@Injectable()
export class ParticipantSummaryBitableService {
  private readonly logger = new Logger(ParticipantSummaryBitableService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ptUserRepo: PlatformUserRepository,
    private readonly participantSummarySvc: ParticipantSummaryService,
    private readonly bitableService: MeetingBitableService,
    private readonly numberRecordBitable: NumberRecordBitableRepository,
    private readonly recordingFileBitable: RecordingFileBitableRepository,
  ) {}

  async processSummary(
    recordingId: string,
    fileId: string,
    uniqueParticipants: ParticipantDetail[],
  ): Promise<void> {
    const distinctSpeakers = await this.prisma.transcriptSegment.findMany({
      where: { transcript: { recordingId: recordingId } },
      select: { speakerId: true },
      distinct: ['speakerId'],
    });
    const validSpeakerIds = new Set(
      distinctSpeakers.map((s) => s.speakerId).filter(Boolean),
    );

    for (const u of uniqueParticipants) {
      const ptByUnionId = await this.ptUserRepo.findByUnionId(
        Platform.TENCENT_MEETING,
        u.uuid,
      );
      if (!ptByUnionId) continue;

      if (validSpeakerIds.has(ptByUnionId.id)) {
        const summaries = await this.participantSummarySvc.generateSummaries({
          recordId: recordingId,
          platformUserIds: [ptByUnionId.id],
        });
        const summary = summaries[ptByUnionId.id];

        const uId = await this.bitableService.safeUpsertMeetingUserRecord(u);
        const recordingFile =
          await this.recordingFileBitable.searchRecordingFileById(fileId);

        const rid = recordingFile.data?.items?.[0]?.record_id || '';

        await this.numberRecordBitable.upsertNumberRecord({
          meet_participant: [uId],
          participant_summary: summary || '',
          record_file: [rid],
        });
      }
    }
  }
}
