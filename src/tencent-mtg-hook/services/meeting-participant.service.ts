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

  /**
   * 同步腾讯会议参会者信息
   * 处理逻辑：
   * 1. 根据传入的会议信息，查找本地数据库中的会议记录
   * 2. 因为腾讯会议中同一个用户可能多次进出，API 会返回多条记录（片段 segment），
   *    所以这里首先通过唯一标识 uuid 将所有片段按用户进行分组
   * 3. 针对每个用户，计算其最早加入时间、最晚离开时间，以及累加的总参会时长
   * 4. 针对用户的每次进出动作，向 meet_user_action 表记录 JOIN 和 LEAVE 事件（使用 findFirst 保证幂等，避免重复写入）
   * 5. 最后，将聚合后的唯一记录（首次进入时间、最后离开时间、总时长等）更新到 meet_participant 表中
   */
  async syncParticipants(r: RecordingData): Promise<void> {
    // 1. 基础校验：如果没有参会者数据，直接返回
    if (!r.participants || r.participants.length === 0) {
      return;
    }

    // 2. 查找对应的本地会议记录
    const meeting = await this.meetingRepo.findByPt(
      Platform.TENCENT_MEETING,
      r.meetid || '',
      r.subid || '__ROOT__',
    );

    if (!meeting) {
      this.logger.warn(
        `Meeting not found for meetid: ${r.meetid}, subid: ${r.subid}`,
      );
      return; // 找不到本地会议，拒绝同步以避免产生孤儿数据
    }

    // 3. 按用户 uuid 将多条参会片段进行分组
    // segmentsByUuid 的结构: { '用户uuid': [片段1, 片段2, ...] }
    const segmentsByUuid = new Map<string, ParticipantDetail[]>();
    for (const p of r.participants) {
      if (!p.uuid) continue; // 过滤掉没有 uuid 的非法/匿名记录

      let segments = segmentsByUuid.get(p.uuid);
      if (!segments) {
        segments = [];
        segmentsByUuid.set(p.uuid, segments);
      }
      segments.push(p);
    }

    // 4. 遍历每一个用户，处理其聚合状态并写入行为日志
    for (const [uuid, segments] of segmentsByUuid.entries()) {
      // 通过 uuid 查找我们系统内的平台用户（应已在 speakerSvc.syncPtUsers 阶段提前落库）
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

      // 初始化计算变量
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

        // 更新最早加入时间
        if (joinTimeNum > 0) {
          minJoinTimeNum = Math.min(minJoinTimeNum, joinTimeNum);
        }
        // 更新最晚离开时间
        if (leftTimeNum > 0) {
          maxLeftTimeNum = Math.max(maxLeftTimeNum, leftTimeNum);
        }

        // 累加本次片段的参会时长
        if (joinTimeNum > 0 && leftTimeNum > 0 && leftTimeNum >= joinTimeNum) {
          totalDurationSeconds += leftTimeNum - joinTimeNum;
        }

        // 记录具体的加入 (JOIN) 行为事件
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
          // 幂等性：如果该时间点的事件未记录，才创建新的操作记录
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

        // 记录具体的离开 (LEAVE) 行为事件
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
          // 幂等性检测
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

      // 5. 数据聚合完毕，准备写入 meet_participant 结果表
      const firstJoinTime =
        minJoinTimeNum !== Infinity ? new Date(minJoinTimeNum * 1000) : null;
      const lastLeaveTime =
        maxLeftTimeNum !== -Infinity ? new Date(maxLeftTimeNum * 1000) : null;

      // 使用该用户最后一个分段的原始数据作为 sessionData 模板（其中包含设备信息、版本号等）
      const sessionData = segments[
        segments.length - 1
      ] as unknown as Prisma.InputJsonValue;

      // 使用 upsert，确保每位用户在这场会议中只保留这一条最新的聚合结果
      await this.participantRepo.upsert(meeting.id, ptUser.id, {
        firstJoinTime,
        lastLeaveTime,
        totalDurationSeconds,
        sessionData,
      });
    }
  }
}
