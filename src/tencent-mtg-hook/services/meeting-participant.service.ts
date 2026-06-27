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
import { Platform, Prisma, MeetingControlAction } from '@prisma/client';
import type { RecordingData } from '../types';
import { ParticipantDetail } from '@/integrations/tencent-meeting/types';

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

    // Group segments by uuid
    const segmentsByUuid = new Map<string, ParticipantDetail[]>();
    for (const p of r.participants) {
      if (!p.uuid) continue;

      let segments = segmentsByUuid.get(p.uuid);
      if (!segments) {
        segments = [];
        segmentsByUuid.set(p.uuid, segments);
      }
      segments.push(p);
    }

    // Process each participant's aggregated status and write action logs
    for (const [uuid, segments] of segmentsByUuid.entries()) {
      const ptUser = await this.prisma.platformUser.findFirst({
        where: {
          platform: Platform.TENCENT_MEETING,
          ptUnionId: uuid,
        },
      });

      if (!ptUser) {
        this.logger.warn(`PlatformUser not found for uuid: ${uuid}`);
        continue;
      }

      let minJoinTimeNum = Infinity;
      let maxLeftTimeNum = -Infinity;
      let totalDurationSeconds = 0;

      for (const segment of segments) {
        const joinTimeNum = segment.join_time
          ? parseInt(segment.join_time, 10)
          : 0;
        const leftTimeNum = segment.left_time
          ? parseInt(segment.left_time, 10)
          : 0;

        if (joinTimeNum > 0) {
          minJoinTimeNum = Math.min(minJoinTimeNum, joinTimeNum);
        }
        if (leftTimeNum > 0) {
          maxLeftTimeNum = Math.max(maxLeftTimeNum, leftTimeNum);
        }

        if (joinTimeNum > 0 && leftTimeNum > 0 && leftTimeNum >= joinTimeNum) {
          totalDurationSeconds += leftTimeNum - joinTimeNum;
        }

        // Log join action event
        if (joinTimeNum > 0) {
          const actionAt = new Date(joinTimeNum * 1000);
          const existing = await this.prisma.meetingUserAction.findFirst({
            where: {
              meetingId: meeting.id,
              ptUserId: ptUser.id,
              action: MeetingControlAction.JOIN_MEETING,
              actionAt,
            },
          });
          if (!existing) {
            await this.prisma.meetingUserAction.create({
              data: {
                meetingId: meeting.id,
                ptUserId: ptUser.id,
                action: MeetingControlAction.JOIN_MEETING,
                actionAt,
                targetType: 'PARTICIPANT',
                targetId: null,
                metadata: segment as unknown as Prisma.InputJsonValue,
              },
            });
          }
        }

        // Log leave action event
        if (leftTimeNum > 0) {
          const actionAt = new Date(leftTimeNum * 1000);
          const existing = await this.prisma.meetingUserAction.findFirst({
            where: {
              meetingId: meeting.id,
              ptUserId: ptUser.id,
              action: MeetingControlAction.LEAVE_MEETING,
              actionAt,
            },
          });
          if (!existing) {
            await this.prisma.meetingUserAction.create({
              data: {
                meetingId: meeting.id,
                ptUserId: ptUser.id,
                action: MeetingControlAction.LEAVE_MEETING,
                actionAt,
                targetType: 'PARTICIPANT',
                targetId: null,
                metadata: segment as unknown as Prisma.InputJsonValue,
              },
            });
          }
        }
      }

      const firstJoinTime =
        minJoinTimeNum !== Infinity ? new Date(minJoinTimeNum * 1000) : null;
      const lastLeaveTime =
        maxLeftTimeNum !== -Infinity ? new Date(maxLeftTimeNum * 1000) : null;

      // Use the last segment in the array as the sessionData template
      const sessionData = segments[
        segments.length - 1
      ] as unknown as Prisma.InputJsonValue;

      await this.participantRepo.upsert(meeting.id, ptUser.id, {
        firstJoinTime,
        lastLeaveTime,
        totalDurationSeconds,
        sessionData,
      });
    }
  }
}
