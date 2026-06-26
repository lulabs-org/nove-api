/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-29 01:59:25
 * @LastEditors: 杨仕明 bot@qclaw.ai
 * @LastEditTime: 2026-03-28 15:57:45
 * @FilePath: /nove_api/src/tencent-mtg-hook/services/speaker.service.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import { NewSpeakerInfo } from '@/tencent-mtg-hook/types';
import { Platform, PlatformUser, User } from '@prisma/client';
import { UserQueryRepository } from '@/user/repositories/user-query.repository';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import {
  SpeakerInfo,
  ParticipantDetail,
} from '@/integrations/tencent-meeting/types';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class SpeakerService {
  private readonly logger = new Logger(SpeakerService.name);

  constructor(
    private readonly ptUserRepo: PlatformUserRepository,
    private readonly userRepo: UserQueryRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Enriches speaker information by matching it against meeting participants or platform users.
   * It attempts to find a match in the following order:
   * 1. Exact match with a participant (by userid, openId, or ms_open_id).
   * 2. Match with a platform user by userid.
   * 3. Match with a participant by username.
   * 4. Match with a platform user by username.
   * If a match is found, it merges the additional details into the speaker info.
   *
   * @param speakerInfo The original speaker information to enrich
   * @param participants Array of participants in the meeting to match against
   * @returns The enriched speaker information, or the original if no match is found
   */
  async enrichSpeakerInfo(
    speakerInfo: SpeakerInfo,
    participants: ParticipantDetail[],
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

  /**
   * Attempts to find an exact match for a speaker among participants using unique identifiers.
   */
  private matchExact(
    speakerInfo: SpeakerInfo,
    participants: ParticipantDetail[],
  ): ParticipantDetail | undefined {
    return participants.find(
      (p) =>
        (speakerInfo.userid && p.userid === speakerInfo.userid) ||
        (speakerInfo.openId && p.open_id === speakerInfo.openId) ||
        (speakerInfo.ms_open_id && p.ms_open_id === speakerInfo.ms_open_id),
    );
  }

  /**
   * Attempts to find a match for a speaker among participants using their username.
   */
  private matchName(
    username: string | undefined,
    participants: ParticipantDetail[],
  ): ParticipantDetail | undefined {
    if (!username) {
      return undefined;
    }
    return participants.find((p) => p.user_name === username);
  }

  /**
   * Finds a platform user by their Tencent Meeting userid.
   */
  private async findUserById(
    userid: string | undefined,
  ): Promise<PlatformUser | null> {
    if (!userid) {
      return null;
    }
    return this.ptUserRepo.findByPtUserId(Platform.TENCENT_MEETING, userid);
  }

  /**
   * Finds a platform user by their username.
   */
  private async findUserByName(
    username: string | undefined,
  ): Promise<PlatformUser | null> {
    if (!username) {
      return null;
    }
    return this.ptUserRepo.findByPtName(Platform.TENCENT_MEETING, username);
  }

  /**
   * Merges participant details into the speaker info, excluding certain keys to avoid overwriting or redundant data.
   */
  private enrichParticipant(
    speakerInfo: SpeakerInfo,
    participant: ParticipantDetail,
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

  /**
   * Merges platform user details (like union ID and phone hash) into the speaker info.
   */
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

  /**
   * Synchronizes Tencent Meeting participants to the local platform user database.
   * Handles various scenarios of merging and linking platform users (Tencent Meeting users)
   * with local registered users based on phone numbers and platform union IDs.
   *
   * @param uniqueParticipants Array of unique participant details from the meeting
   */
  async syncPtUsers(uniqueParticipants: ParticipantDetail[]): Promise<void> {
    const countryCode = '+86';

    try {
      for (const participant of uniqueParticipants) {
        if (participant.phone && participant.userid === '') {
          // 1. Check for an existing unlinked platform user by phone hash
          const ptByPhone =
            await this.ptUserRepo.findByPhoneHashWithoutLocalUser(
              Platform.TENCENT_MEETING,
              countryCode,
              participant.phone,
            );

          let userByPhone: User | null = null;

          // 2. If we found an unlinked platform user with a decrypted phone, find the corresponding local user
          if (ptByPhone?.phone) {
            userByPhone = await this.userRepo.byPhone(
              countryCode,
              ptByPhone.phone,
            );
          }

          // 3. Find platform user by their unique Tencent Meeting union ID (uuid)
          const ptByUnionId = await this.ptUserRepo.findByUnionId(
            Platform.TENCENT_MEETING,
            participant.uuid,
          );

          // Scenario A: Found an unlinked phone record and a local user, but no union ID record exists yet.
          // Action: Update the phone record with the new union ID (ptUserId) and link it to the local user.
          if (ptByPhone && !ptByUnionId && userByPhone) {
            await this.ptUserRepo.update(ptByPhone.id, {
              ptUserId: participant.userid,
              displayName: participant.user_name,
              phoneHash: participant.phone,
              phone: ptByPhone.phone,
              localUserId: userByPhone.id,
            });
          }

          // Scenario B: Found both an unlinked phone record and a union ID record, plus a local user.
          // Action: Merge them by updating the union ID record with the phone/user info, and delete the redundant phone record.
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

          // Scenario C: No existing records found for this phone or union ID.
          // Action: Create a new platform user record with the available info.
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

          // Scenario D: Found a union ID record, but the unlinked phone check didn't yield results (ptByPhone is null).
          // Action: Check if there's a platform record for this phone that is *already linked* to a user.
          // If found, and it belongs to a local user, update our union ID record to link to that same local user.
          if (!ptByPhone && ptByUnionId && !userByPhone) {
            const ptByPhoneHasUser = await this.ptUserRepo.findByPhoneHash(
              Platform.TENCENT_MEETING,
              countryCode,
              participant.phone,
            );

            // If the record we found is already the one we are processing, do nothing
            if (ptByPhoneHasUser?.ptUnionId === participant.uuid) {
              continue;
            }

            if (ptByPhoneHasUser?.phone) {
              const userByPhoneHasUser = await this.userRepo.byPhone(
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

        // Scenario E: Participant does not need complex phone mapping
        // Action: Upsert their platform user record using only their union ID and basic info.
        if (!(participant.phone && participant.userid === '')) {
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

  /**
   * Synchronizes Tencent Meeting participants to the local platform user database (Simplified version).
   * Uses the new UserPhoneHash table to directly link platform users to local users.
   *
   * @param uniqueParticipants Array of unique participant details from the meeting
   */
  async syncPtUsersV2(uniqueParticipants: ParticipantDetail[]): Promise<void> {
    try {
      for (const participant of uniqueParticipants) {
        let localUserId: string | undefined;

        if (participant.phone && participant.userid === '') {
          const userPhoneHash = await this.prisma.userPhoneHash.findUnique({
            where: {
              hashValue: participant.phone,
            },
          });

          if (userPhoneHash) {
            localUserId = userPhoneHash.userId;
          }
        }

        await this.ptUserRepo.upsert(
          {
            platform: Platform.TENCENT_MEETING,
            ptUnionId: participant.uuid,
          },
          {
            ptUserId: participant.userid,
            displayName: participant.user_name,
            phoneHash: participant.phone,
            ...(localUserId ? { localUserId } : {}),
          },
        );
      }
    } catch (error) {
      this.logger.error('Error processing unique participants in V2:', error);
    }
  }
}
