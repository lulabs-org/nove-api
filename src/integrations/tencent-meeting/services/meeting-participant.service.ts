/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-24 00:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-22 02:01:01
 * @FilePath: /nove_api/src/integrations/tencent-meeting/services/meeting-participant.service.ts
 * @Description: 会议参与者服务，负责处理会议参与者相关逻辑
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import { TencentApiService } from './api.service';
import { MeetingParticipantDetail, ParticipantsList } from '../types';

/**
 * 会议参与者服务
 * 负责处理会议参与者相关逻辑
 */
@Injectable()
export class ParticipantService {
  private readonly logger = new Logger(ParticipantService.name);

  constructor(private readonly api: TencentApiService) {}

  /**
   * 获取唯一的会议参与者列表
   * @param meetingId 会议ID
   * @param userId 用户ID
   * @param subMeetingId 子会议ID
   * @returns 包含去重和未去重的参与者列表
   */
  async list(
    meetingId: string,
    userId: string,
    subMeetingId?: string,
  ): Promise<ParticipantsList> {
    try {
      const response = await this.api.getParticipants(
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

      const original = response.participants.map(decodeBase64Name);

      const seenUuids = new Set<string>();
      const deduplicated = original.filter((participant) => {
        if (seenUuids.has(participant.uuid)) {
          return false;
        }
        seenUuids.add(participant.uuid);
        return true;
      });

      this.logger.log(
        `获取会议参与者成功: ${meetingId}, 共 ${deduplicated.length} 个唯一参与者, ${original.length} 个总参与者`,
      );

      return {
        deduplicated,
        original,
      };
    } catch (error: unknown) {
      this.logger.warn(`获取会议参与者失败: ${meetingId}`, error);
      return {
        deduplicated: [],
        original: [],
      };
    }
  }
}
