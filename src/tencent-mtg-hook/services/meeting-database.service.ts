/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-24
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-22 02:49:17
 * @FilePath: /nove_api/src/tencent-mtg-hook/services/meeting-database.service.ts
 * @Description: 会议数据库服务，处理会议记录的创建和更新
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { Meetuser, EventPayload } from '../types';
import { TencentEventUtils } from '../utils/tencent-event.utils';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import { MeetingRepository } from '@/meeting/repositories/meeting.repository';
import { Platform, PlatformUser, Prisma } from '@prisma/client';

/**
 * 会议数据库服务
 * 提供会议记录的创建和更新功能
 */
@Injectable()
export class MeetingDatabaseService {
  constructor(
    private readonly ptUserRepo: PlatformUserRepository,
    private readonly meetingRepo: MeetingRepository,
  ) {}

  /**
   * 创建或更新会议记录
   * @param payload 腾讯会议事件载荷
   */
  async upsert(payload: EventPayload, event: string): Promise<void> {
    const { meeting_info, operate_time } = payload;

    if (!meeting_info) {
      throw new Error('Meeting info is required but not provided');
    }

    const { creator } = meeting_info;

    const meetingType = TencentEventUtils.convertMeetingType(
      meeting_info.meeting_type as number,
    );

    const creatorUser = await this.upsertPtUser(creator as Meetuser);

    type MeetingData = Omit<
      Prisma.MeetingUncheckedCreateInput,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'deletedAt'
      | 'platform'
      | 'meetingId'
      | 'subMeetingId'
    >;

    const meetingData: Partial<MeetingData> = {
      title: meeting_info.subject,
      meetingCode: meeting_info.meeting_code,
      type: meetingType,
      hostId: creatorUser.id,
      createdById: creatorUser.id,
      scheduledStartAt: new Date(meeting_info.start_time * 1000),
      scheduledEndAt: new Date(meeting_info.end_time * 1000),
    };

    if (event === 'meeting.started') {
      meetingData.startAt = new Date(operate_time);
    }

    if (event === 'meeting.end') {
      meetingData.endAt = new Date(operate_time);
    }

    await this.meetingRepo.upsert(
      Platform.TENCENT_MEETING,
      meeting_info.meeting_id,
      'sub_meeting_id' in meeting_info
        ? meeting_info.sub_meeting_id || '__ROOT__'
        : '__ROOT__',
      meetingData as MeetingData,
    );
  }

  /**
   * 创建或更新平台用户记录
   * @param user 用户信息
   */
  async upsertPtUser(user: Meetuser): Promise<PlatformUser> {
    if (!user.uuid) {
      throw new Error(
        `User UUID is required but not provided for user ${user.user_name || 'unknown'}`,
      );
    }

    try {
      const result = await this.ptUserRepo.upsert(
        {
          platform: Platform.TENCENT_MEETING,
          ptUnionId: user.uuid,
        },
        {
          ptUserId: user.userid,
          displayName: user.user_name,
          platformData: {
            instance_id: user.instance_id,
            ms_open_id: user.ms_open_id,
          },
        },
      );
      return result;
    } catch (error) {
      throw new Error(
        `Failed to upsert platform user for user ${user.uuid}: ${(error as Error).message}`,
      );
    }
  }
}
