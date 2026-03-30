/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-30 19:12:18
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-30 19:17:58
 * @FilePath: /nove_api/src/tencent-mtg-hook/services/meeting-participant.service.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  MeetingParticipantRepository,
  MeetingRepository,
} from '@/meeting/repositories';
import { PrismaService } from '../../prisma/prisma.service';
import { Platform, Prisma } from '@prisma/client';
import type { RecordingData } from '../types';

@Injectable()
export class MeetingParticipantService {
  private readonly logger = new Logger(MeetingParticipantService.name);

  constructor(
    private readonly participantRepo: MeetingParticipantRepository,
    private readonly meetingRepo: MeetingRepository,
    private readonly prisma: PrismaService,
  ) {}

  async syncParticipants(r: RecordingData): Promise<void> {
    if (!r.participants || r.participants.length === 0) {
      return;
    }

    const meeting = await this.meetingRepo.findByPt(
      Platform.TENCENT_MEETING,
      r.meetid || '',
      r.subid || '__ROOT__',
    );

    if (!meeting) {
      this.logger.warn(
        `Meeting not found for meetid: ${r.meetid}, subid: ${r.subid}`,
      );
      return;
    }

    for (const p of r.participants) {
      if (!p.uuid) continue;

      const ptUser = await this.prisma.platformUser.findFirst({
        where: {
          platform: Platform.TENCENT_MEETING,
          ptUnionId: p.uuid,
        },
      });

      if (!ptUser) {
        this.logger.warn(`PlatformUser not found for uuid: ${p.uuid}`);
        continue;
      }

      const joinTimeNum = p.join_time ? parseInt(p.join_time, 10) : 0;
      const leftTimeNum = p.left_time ? parseInt(p.left_time, 10) : 0;

      const joinTime = joinTimeNum > 0 ? new Date(joinTimeNum * 1000) : null;
      const leftTime = leftTimeNum > 0 ? new Date(leftTimeNum * 1000) : null;

      let durationSeconds: number | null = null;
      if (joinTimeNum > 0 && leftTimeNum > 0 && leftTimeNum >= joinTimeNum) {
        durationSeconds = leftTimeNum - joinTimeNum;
      }

      const sessionData = p as unknown as Prisma.InputJsonValue;

      await this.participantRepo.upsert(meeting.id, ptUser.id, {
        joinTime,
        leftTime,
        durationSeconds,
        sessionData,
      });
    }
  }
}
