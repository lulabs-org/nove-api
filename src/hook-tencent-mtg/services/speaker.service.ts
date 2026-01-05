/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-29 01:59:25
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-05 07:41:50
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/services/speaker.service.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { Platform, PlatformUser } from '@prisma/client';
import { NewSpeakerInfo } from '@/hook-tencent-mtg/types';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import {
  SpeakerInfo,
  MeetingParticipantDetail,
} from '@/integrations/tencent-meeting/types';

@Injectable()
export class SpeakerService {
  constructor(
    private readonly platformUserRepository: PlatformUserRepository,
  ) {}

  async enrichSpeakerInfo(
    speakerInfo: SpeakerInfo,
    participants: MeetingParticipantDetail[],
  ): Promise<NewSpeakerInfo> {
    if (!speakerInfo) {
      return speakerInfo;
    }

    const participant = this.findParticipantByExactMatch(
      speakerInfo,
      participants,
    );

    if (participant) {
      return this.enrichWithParticipantInfo(speakerInfo, participant);
    }

    const platformUserByUserId = await this.findPlatformUserByUserId(
      speakerInfo.userid,
    );

    if (platformUserByUserId) {
      return this.enrichWithPlatformUserInfo(speakerInfo, platformUserByUserId);
    }

    const participantByUsername = this.findParticipantByUsername(
      speakerInfo.username,
      participants,
    );

    if (participantByUsername) {
      return this.enrichWithParticipantInfo(speakerInfo, participantByUsername);
    }

    const platformUserByUsername = await this.findPlatformUserByUsername(
      speakerInfo.username,
    );

    if (platformUserByUsername) {
      return this.enrichWithPlatformUserInfo(
        speakerInfo,
        platformUserByUsername,
      );
    }

    return speakerInfo;
  }

  private findParticipantByExactMatch(
    speakerInfo: SpeakerInfo,
    participants: MeetingParticipantDetail[],
  ): MeetingParticipantDetail | undefined {
    return participants.find(
      (p) =>
        (speakerInfo.userid && p.userid === speakerInfo.userid) ||
        (speakerInfo.openId && p.open_id === speakerInfo.openId) ||
        (speakerInfo.ms_open_id && p.ms_open_id === speakerInfo.ms_open_id),
    );
  }

  private findParticipantByUsername(
    username: string | undefined,
    participants: MeetingParticipantDetail[],
  ): MeetingParticipantDetail | undefined {
    if (!username) {
      return undefined;
    }
    return participants.find((p) => p.user_name === username);
  }

  private async findPlatformUserByUserId(
    userid: string | undefined,
  ): Promise<PlatformUser | null> {
    if (!userid) {
      return null;
    }
    return this.platformUserRepository.findByPtUserId(
      Platform.TENCENT_MEETING,
      userid,
    );
  }

  private async findPlatformUserByUsername(
    username: string | undefined,
  ): Promise<PlatformUser | null> {
    if (!username) {
      return null;
    }
    return this.platformUserRepository.findByPtName(
      Platform.TENCENT_MEETING,
      username,
    );
  }

  private enrichWithParticipantInfo(
    speakerInfo: SpeakerInfo,
    participant: MeetingParticipantDetail,
  ): NewSpeakerInfo {
    const excludedKeys = [
      'userid',
      'user_name',
      'join_time',
      'left_time',
      'join_type',
      'ms_open_id',
      'open_id',
    ];
    const rest = Object.fromEntries(
      Object.entries(participant).filter(
        ([key]) => !excludedKeys.includes(key),
      ),
    );
    return {
      ...speakerInfo,
      ...rest,
    };
  }

  private enrichWithPlatformUserInfo(
    speakerInfo: SpeakerInfo,
    platformUser: PlatformUser,
  ): NewSpeakerInfo {
    return {
      ...speakerInfo,
      uuid: platformUser.ptUnionId ?? undefined,
      phone: platformUser.phoneHash ?? undefined,
    };
  }
}
