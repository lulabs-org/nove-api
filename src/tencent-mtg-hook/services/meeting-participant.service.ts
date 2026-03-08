/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-24 00:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-04 01:12:17
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/services/meeting-participant.service.ts
 * @Description: 会议参与者服务，负责处理会议参与者相关逻辑
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import { TencentApiService } from '@/integrations/tencent-meeting/api.service';
import { MeetingParticipantDetail } from '@/integrations/tencent-meeting/types';
import { MeetingParticipantsResult } from '../types';
// import { MeetingUserBitableRepository } from '@/integrations/lark/repositories';

/**
 * 会议参与者服务
 * 负责处理会议参与者相关逻辑
 */
@Injectable()
export class MeetingParticipantService {
  private readonly logger = new Logger(MeetingParticipantService.name);

  constructor(private readonly tencentMeetingApi: TencentApiService) {}

  /**
   * 获取唯一的会议参与者列表
   * @param meetingId 会议ID
   * @param userId 用户ID
   * @param subMeetingId 子会议ID
   * @returns 包含去重和未去重的参与者列表
   */
  async getUniqueParticipants(
    meetingId: string,
    userId: string,
    subMeetingId?: string,
  ): Promise<MeetingParticipantsResult> {
    try {
      const response = await this.tencentMeetingApi.getParticipants(
        meetingId,
        userId,
        subMeetingId,
      );

      const decodeBase64Name = (participant: MeetingParticipantDetail) => ({
        ...participant,
        user_name: Buffer.from(participant.user_name, 'base64').toString(
          'utf-8',
        ),
      });

      const allParticipants = response.participants.map(decodeBase64Name);

      const seenUuids = new Set<string>();
      const uniqueParticipants = allParticipants.filter((participant) => {
        if (seenUuids.has(participant.uuid)) {
          return false;
        }
        seenUuids.add(participant.uuid);
        return true;
      });

      this.logger.log(
        `获取会议参与者成功: ${meetingId}, 共 ${uniqueParticipants.length} 个唯一参与者, ${allParticipants.length} 个总参与者`,
      );

      return {
        uniqueParticipants,
        allParticipants,
      };
    } catch (error: unknown) {
      this.logger.warn(`获取会议参与者失败: ${meetingId}`, error);
      return {
        uniqueParticipants: [],
        allParticipants: [],
      };
    }
  }
}
