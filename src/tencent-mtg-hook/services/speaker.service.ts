/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-29 01:59:25
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-22 02:12:41
 * @FilePath: /nove_api/src/tencent-mtg-hook/services/speaker.service.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import { NewSpeakerInfo } from '@/tencent-mtg-hook/types';
import { Platform, PlatformUser, User } from '@prisma/client';
import { UserRepository } from '@/user/repositories/user.repository';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import {
  SpeakerInfo,
  MeetingParticipantDetail,
} from '@/integrations/tencent-meeting/types';

@Injectable()
export class SpeakerService {
  private readonly logger = new Logger(SpeakerService.name);

  constructor(
    private readonly ptUserRepo: PlatformUserRepository,
    private readonly userRepo: UserRepository,
  ) {}

  async enrichSpeakerInfo(
    speakerInfo: SpeakerInfo,
    participants: MeetingParticipantDetail[],
  ): Promise<NewSpeakerInfo> {
    if (!speakerInfo) {
      return speakerInfo;
    }

    const participant = this.matchExact(speakerInfo, participants);

    if (participant) {
      return this.enrichParticipant(speakerInfo, participant);
    }

    const platformUserByUserId = await this.findUserById(speakerInfo.userid);

    if (platformUserByUserId) {
      return this.enrichUser(speakerInfo, platformUserByUserId);
    }

    const participantByUsername = this.matchName(
      speakerInfo.username,
      participants,
    );

    if (participantByUsername) {
      return this.enrichParticipant(speakerInfo, participantByUsername);
    }

    const platformUserByUsername = await this.findUserByName(
      speakerInfo.username,
    );

    if (platformUserByUsername) {
      return this.enrichUser(speakerInfo, platformUserByUsername);
    }

    return speakerInfo;
  }

  private matchExact(
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

  private matchName(
    username: string | undefined,
    participants: MeetingParticipantDetail[],
  ): MeetingParticipantDetail | undefined {
    if (!username) {
      return undefined;
    }
    return participants.find((p) => p.user_name === username);
  }

  private async findUserById(
    userid: string | undefined,
  ): Promise<PlatformUser | null> {
    if (!userid) {
      return null;
    }
    return this.ptUserRepo.findByPtUserId(Platform.TENCENT_MEETING, userid);
  }

  private async findUserByName(
    username: string | undefined,
  ): Promise<PlatformUser | null> {
    if (!username) {
      return null;
    }
    return this.ptUserRepo.findByPtName(Platform.TENCENT_MEETING, username);
  }

  private enrichParticipant(
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

  private enrichUser(
    speakerInfo: SpeakerInfo,
    platformUser: PlatformUser,
  ): NewSpeakerInfo {
    return {
      ...speakerInfo,
      uuid: platformUser.ptUnionId ?? undefined,
      phone: platformUser.phoneHash ?? undefined,
    };
  }

  async syncPtUsers(
    uniqueParticipants: MeetingParticipantDetail[],
  ): Promise<void> {
    const excludedPhoneHash =
      'df363d826259f591c0f02ce0be670eee8785eaa0477cf152944af46e008a3086';
    const countryCode = '+86';

    try {
      for (const participant of uniqueParticipants) {
        if (participant.phone && participant.phone !== excludedPhoneHash) {
          const ptByPhone =
            await this.ptUserRepo.findByPhoneHashWithoutLocalUser(
              Platform.TENCENT_MEETING,
              countryCode,
              participant.phone,
            );

          let userByPhone: User | null = null;

          if (ptByPhone?.phone) {
            userByPhone = await this.userRepo.findByPhone(
              countryCode,
              ptByPhone.phone,
            );
          }

          const ptByUnionId = await this.ptUserRepo.findByUnionId(
            Platform.TENCENT_MEETING,
            participant.uuid,
          );

          if (ptByPhone && !ptByUnionId && userByPhone) {
            await this.ptUserRepo.update(ptByPhone.id, {
              ptUserId: participant.userid,
              displayName: participant.user_name,
              phoneHash: participant.phone,
              phone: ptByPhone.phone,
              localUserId: userByPhone.id,
            });
          }

          if (ptByPhone && ptByUnionId && userByPhone) {
            const updatedPtByUnionId = await this.ptUserRepo.update(
              ptByUnionId.id,
              {
                ptUserId: participant.userid,
                displayName: participant.user_name,
                phoneHash: participant.phone,
                countryCode,
                phone: ptByPhone.phone,
                localUserId: userByPhone.id,
              },
            );

            if (updatedPtByUnionId) {
              await this.ptUserRepo.deleteById(ptByPhone.id);
            }
          }

          if (!ptByPhone && !ptByUnionId) {
            await this.ptUserRepo.upsert(
              {
                platform: Platform.TENCENT_MEETING,
                ptUnionId: participant.uuid,
              },
              {
                ptUserId: participant.userid,
                displayName: participant.user_name,
                phoneHash: participant.phone,
              },
            );
          }

          if (!ptByPhone && ptByUnionId && !userByPhone) {
            const ptByPhoneHasUser = await this.ptUserRepo.findByPhoneHash(
              Platform.TENCENT_MEETING,
              countryCode,
              participant.phone,
            );

            if (ptByPhoneHasUser?.ptUnionId === participant.uuid) {
              continue;
            }

            if (ptByPhoneHasUser?.phone) {
              const userByPhoneHasUser = await this.userRepo.findByPhone(
                countryCode,
                ptByPhoneHasUser.phone,
              );

              if (userByPhoneHasUser) {
                await this.ptUserRepo.update(ptByUnionId.id, {
                  ptUserId: participant.userid,
                  displayName: participant.user_name,
                  phoneHash: participant.phone,
                  countryCode,
                  phone: ptByPhoneHasUser.phone,
                  localUserId: userByPhoneHasUser.id,
                });
              }
            }
          }
        }

        if (!participant.phone || participant.phone == excludedPhoneHash) {
          await this.ptUserRepo.upsert(
            {
              platform: Platform.TENCENT_MEETING,
              ptUnionId: participant.uuid,
            },
            {
              ptUserId: participant.userid,
              displayName: participant.user_name,
              phoneHash: participant.phone,
            },
          );
        }
      }
    } catch (error) {
      this.logger.error('Error processing unique participants:', error);
    }
  }
}
