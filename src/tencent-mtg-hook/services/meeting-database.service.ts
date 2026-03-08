/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-24
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-05 19:22:21
 * @FilePath: /nove_api/src/hook-tencent-mtg/services/meeting-database.service.ts
 * @Description: 会议数据库服务，处理会议记录的创建和更新
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import {
  TencentMeetingInfoPayload,
  Meetuser,
} from '../types/tencent-event.types';
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
    private readonly ptUserRepository: PlatformUserRepository,
    private readonly meetingRepository: MeetingRepository,
  ) {}

  /**
   * 创建或更新会议记录
   * @param payload 腾讯会议事件载荷
   */
  async upsertMeetingRecord(
    payload: TencentMeetingInfoPayload,
    event: string,
  ): Promise<void> {
    const { meeting_info, operate_time } = payload;

    if (!meeting_info) {
      throw new Error('Meeting info is required but not provided');
    }

    const { creator } = meeting_info;

    const meetingType = TencentEventUtils.convertMeetingType(
      meeting_info.meeting_type as number,
    );

    const creatorUser = await this.upsertPlatformUser(creator);

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
    };

    if (event === 'meeting.started') {
      meetingData.startAt = new Date(operate_time * 1000);
    }

    if (event === 'meeting.ended') {
      meetingData.endAt = new Date(operate_time * 1000);
    }

    await this.meetingRepository.upsert(
      Platform.TENCENT_MEETING,
      meeting_info.meeting_id,
      meeting_info.sub_meeting_id || '__ROOT__',
      meetingData as MeetingData,
    );
  }

  /**
   * 创建或更新平台用户记录
   * @param user 用户信息
   */
  async upsertPlatformUser(user: Meetuser): Promise<PlatformUser> {
    if (!user.uuid) {
      throw new Error(
        `User UUID is required but not provided for user ${user.user_name || 'unknown'}`,
      );
    }

    try {
      const result = await this.ptUserRepository.upsert(
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
