/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-11-23 11:04:45
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-11-23 11:18:42
 * @FilePath: /nove_api/src/lark-meeting/services/lark-meeting.service.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

// src/lark-meeting/services/lark-meeting.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { MeetingBitableRepository } from '@/integrations/lark';
import { MeetingEndedEventData } from '../types/lark-meeting.types';
import { toMs } from '../util/time.util';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { LarkEvent } from '../enums/lark-event.enum';
import { PrismaService } from '@/prisma/prisma.service';
import {
  Platform,
  MeetingPlatform,
  WebhookStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class LarkMeetingService {
  private readonly logger = new Logger(LarkMeetingService.name);

  constructor(
    private readonly meetingBitable: MeetingBitableRepository,
    @InjectQueue('lark-events') private readonly queue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async enqueueMeetingEnded(data: MeetingEndedEventData): Promise<void> {
    await this.queue.add('meetingEnded', data, {
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 24 * 3600, count: 1000 },
    });
  }

  async handleMeetingEnded(data: MeetingEndedEventData): Promise<void> {
    const meetingId = data?.meeting?.id;
    this.logger.log({
      event: 'meeting_ended',
      event_type: LarkEvent.VC_MEETING_ALL_ENDED_V1,
      meeting_id: meetingId,
    });
    if (!meetingId) return;

    const m = data.meeting;
    const startTimeMs = toMs(m.start_time);
    const endTimeMs = toMs(m.end_time);

    // 1. 保存 webhook 原始事件日志
    await this.prisma.webhookLog
      .create({
        data: {
          provider: 'feishu',
          event: data.event_type || 'vc.meeting.all_meeting_ended_v1',
          payload: data as unknown as Prisma.InputJsonValue,
          status: WebhookStatus.SUCCESS,
        },
      })
      .catch((err) => this.logger.error('save_webhook_log_failed', err));

    // 2. 插入或更新平台用户信息 (主持人与会议所有者)
    const upsertPlatformUser = async (
      user?: MeetingEndedEventData['meeting']['host_user'],
    ) => {
      if (!user?.id?.union_id) return null;
      return this.prisma.platformUser.upsert({
        where: {
          unique_platform_union_user: {
            platform: Platform.FEISHU,
            ptUnionId: user.id.union_id,
          },
        },
        create: {
          platform: Platform.FEISHU,
          ptUnionId: user.id.union_id,
          ptUserId: user.id.user_id,
          platformData: user as unknown as Prisma.InputJsonValue,
        },
        update: {
          ptUserId: user.id.user_id,
          platformData: user as unknown as Prisma.InputJsonValue,
        },
      });
    };

    let hostRecord: { id: string } | null | undefined;
    let ownerRecord: { id: string } | null | undefined;
    try {
      if (m.host_user) hostRecord = await upsertPlatformUser(m.host_user);
      if (m.owner) ownerRecord = await upsertPlatformUser(m.owner);
    } catch (err) {
      this.logger.error('upsert_platform_user_failed', err);
    }

    // 3. 插入或更新会议信息
    try {
      const startTime = startTimeMs ? new Date(startTimeMs) : undefined;
      const endTime = endTimeMs ? new Date(endTimeMs) : undefined;
      const durationSeconds =
        startTimeMs && endTimeMs
          ? Math.floor((endTimeMs - startTimeMs) / 1000)
          : undefined;

      await this.prisma.meeting.upsert({
        where: {
          platform_meetingId_subMeetingId: {
            platform: MeetingPlatform.FEISHU,
            meetingId: m.id,
            subMeetingId: '__ROOT__',
          },
        },
        create: {
          platform: MeetingPlatform.FEISHU,
          meetingId: m.id,
          title: m.topic || '飞书会议',
          meetingCode: m.meeting_no,
          startAt: startTime,
          endAt: endTime,
          durationSeconds,
          hostId: hostRecord?.id,
          createdById: ownerRecord?.id,
          metadata: m as unknown as Prisma.InputJsonValue,
        },
        update: {
          title: m.topic || '飞书会议',
          meetingCode: m.meeting_no,
          startAt: startTime,
          endAt: endTime,
          durationSeconds,
          hostId: hostRecord?.id,
          createdById: ownerRecord?.id,
          metadata: m as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.error('upsert_meeting_failed', err);
    }

    // 4. 同步至 Bitable (保留原有逻辑)
    await this.meetingBitable
      .upsertMeetingRecord({
        platform: '飞书会议',
        meeting_id: m.id,
        ...(m.topic && { subject: m.topic }),
        ...(m.meeting_no && { meeting_code: m.meeting_no }),
        ...(startTimeMs !== undefined && { start_time: startTimeMs }),
        ...(endTimeMs !== undefined && { end_time: endTimeMs }),
      })
      .catch((err) => this.logger.error('upsertMeetingRecord_failed', err));
  }
}
