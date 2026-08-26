/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-30 19:12:18
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-30 19:17:58
 * @FilePath: /nove_api/src/tencent-mtg/services/meeting-participant.service.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import { MeetingParticipantRepository } from '@/meeting/repositories';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Platform,
  Prisma,
  MeetingControlAction,
  Meeting,
} from '@prisma/client';
import { ParticipantDetail } from '@/integrations/tencent-meeting/types';

@Injectable()
export class MeetingParticipantService {
  private readonly logger = new Logger(MeetingParticipantService.name);

  constructor(
    private readonly participantRepo: MeetingParticipantRepository,
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
  async syncParticipants(
    meeting: Meeting,
    rawParticipants: ParticipantDetail[],
  ): Promise<void> {
    // 1. 基础校验：如果没有参会者数据，直接返回
    if (!rawParticipants || rawParticipants.length === 0) {
      return;
    }

    // 2. 按用户 uuid 将多条参会片段进行分组
    const segmentsByUuid = new Map<string, ParticipantDetail[]>();
    for (const p of rawParticipants) {
      if (!p.uuid) continue; // 过滤掉没有 uuid 的非法/匿名记录
      const segments = segmentsByUuid.get(p.uuid) || [];
      segments.push(p);
      segmentsByUuid.set(p.uuid, segments);
    }

    const uuids = Array.from(segmentsByUuid.keys());
    if (uuids.length === 0) return;

    // 3. 批量查询我们系统内的平台用户，避免在循环中逐个发 SQL
    const ptUsers = await this.prisma.platformUser.findMany({
      where: {
        platform: Platform.TENCENT_MEETING,
        ptUnionId: { in: uuids },
      },
    });
    const ptUserMap = new Map(ptUsers.map((u) => [u.ptUnionId, u]));

    // 4. 批量查询该会议下已有的行为日志，建立内存 Set 保证幂等过滤
    const existingActions = await this.prisma.meetingUserAction.findMany({
      where: { meetingId: meeting.id },
      select: { ptUserId: true, action: true, actionAt: true },
    });
    const existingActionSet = new Set(
      existingActions.map(
        (a) => `${a.ptUserId}-${a.action}-${a.actionAt.getTime()}`,
      ),
    );

    const actionsToCreate: Prisma.MeetingUserActionCreateManyInput[] = [];
    const upsertPromises: Promise<any>[] = [];

    // 5. 遍历每一个用户，处理其聚合状态并构建日志记录
    for (const [uuid, segments] of segmentsByUuid.entries()) {
      const ptUser = ptUserMap.get(uuid);
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

        // 更新最早加入时间与最晚离开时间
        if (joinTimeNum > 0)
          minJoinTimeNum = Math.min(minJoinTimeNum, joinTimeNum);
        if (leftTimeNum > 0)
          maxLeftTimeNum = Math.max(maxLeftTimeNum, leftTimeNum);

        // 累加本次片段的参会时长
        if (joinTimeNum > 0 && leftTimeNum > 0 && leftTimeNum >= joinTimeNum) {
          totalDurationSeconds += leftTimeNum - joinTimeNum;
        }

        // 收集具体的加入 (JOIN) 行为事件
        if (joinTimeNum > 0) {
          const actionAt = new Date(joinTimeNum * 1000);
          const key = `${ptUser.id}-${MeetingControlAction.JOIN_MEETING}-${actionAt.getTime()}`;
          if (!existingActionSet.has(key)) {
            existingActionSet.add(key);
            actionsToCreate.push({
              meetingId: meeting.id,
              ptUserId: ptUser.id,
              action: MeetingControlAction.JOIN_MEETING,
              actionAt,
              targetType: 'PARTICIPANT',
              metadata: segment as unknown as Prisma.InputJsonValue,
            });
          }
        }

        // 收集具体的离开 (LEAVE) 行为事件
        if (leftTimeNum > 0) {
          const actionAt = new Date(leftTimeNum * 1000);
          const key = `${ptUser.id}-${MeetingControlAction.LEAVE_MEETING}-${actionAt.getTime()}`;
          if (!existingActionSet.has(key)) {
            existingActionSet.add(key);
            actionsToCreate.push({
              meetingId: meeting.id,
              ptUserId: ptUser.id,
              action: MeetingControlAction.LEAVE_MEETING,
              actionAt,
              targetType: 'PARTICIPANT',
              metadata: segment as unknown as Prisma.InputJsonValue,
            });
          }
        }
      }

      // 准备该用户最新的聚合结果
      const firstJoinTime =
        minJoinTimeNum !== Infinity ? new Date(minJoinTimeNum * 1000) : null;
      const lastLeaveTime =
        maxLeftTimeNum !== -Infinity ? new Date(maxLeftTimeNum * 1000) : null;
      const metadata = segments[
        segments.length - 1
      ] as unknown as Prisma.InputJsonValue;

      // 压入并发队列
      upsertPromises.push(
        this.participantRepo.upsert(meeting.id, ptUser.id, {
          firstJoinTime,
          lastLeaveTime,
          totalDurationSeconds,
          metadata,
        }),
      );
    }

    // 6. 并发执行：批量保存所有用户的聚合结果，以及批量创建日志
    await Promise.all([
      ...upsertPromises,
      actionsToCreate.length > 0
        ? this.prisma.meetingUserAction.createMany({
            data: actionsToCreate,
            skipDuplicates: true,
          })
        : Promise.resolve(),
    ]);
  }
}
