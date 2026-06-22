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
import { ParticipantDetail, ProcessedParticipants } from '../types';

/**
 * 腾讯会议参与者服务 (Tencent Meeting Participant Service)
 * 负责与腾讯会议系统交互，处理会议参会人员的相关业务逻辑，
 * 主要提供拉取参会人员名单、信息解码、人员去重等核心功能。
 */
@Injectable()
export class ParticipantService {
  private readonly logger = new Logger(ParticipantService.name);

  constructor(private readonly api: TencentApiService) {}

  /**
   * 获取并处理会议参与者列表
   * 该方法从腾讯会议 API 获取指定会议的参与者名单，并对数据进行两步处理：
   * 1. 解码：将 Base64 编码的用户名解码为 UTF-8 字符串
   * 2. 去重：根据用户的唯一标识 uuid 进行去重，仅保留其首次参会记录
   *
   * @param meetingId 腾讯会议的会议唯一标识 ID
   * @param userId 调用 API 的用户 ID (通常是企业应用的 UserID)
   * @param subId (可选) 周期性会议的子会议 ID
   * @param startTime (可选) 筛选参与者加入会议的起始时间戳 (秒)
   * @param endTime (可选) 筛选参与者加入会议的结束时间戳 (秒)
   * @returns 包含原始列表(仅解码)和去重后列表的复合对象 `ProcessedParticipants`
   */
  async list(
    meetingId: string,
    userId: string,
    subId?: string,
    startTime?: number,
    endTime?: number,
  ): Promise<ProcessedParticipants> {
    try {
      // 1. 调用腾讯会议底层 API 拉取参与者原始数据
      // 此处忽略了分页参数 (pos, limit)，直接传递 startTime 和 endTime
      const { participants } = await this.api.getParticipants(
        meetingId,
        userId,
        subId,
        undefined, // pos: 分页获取该会议的起始位置
        undefined, // limit: 单次获取的最大条数
        startTime,
        endTime,
      );

      // 2. 解码 Base64 用户名
      // 腾讯会议 API 返回的 user_name 出于安全性考虑是 base64 编码的，需要解码回普通文本
      const raw = participants.map((p: ParticipantDetail) => ({
        ...p,
        user_name: Buffer.from(p.user_name, 'base64').toString('utf-8'),
      }));

      // 3. 参与者去重
      // 同一个用户可能会在会议中多次进出(例如掉线重连)，因此 uuid 会重复出现。
      // 利用 Set.add() 返回 Set 本身(在 JS 中为真值)的特性，实现单行高效率去重并保留首次记录
      const seenUuids = new Set<string>();
      const unique = raw.filter(
        (p) => !seenUuids.has(p.uuid) && seenUuids.add(p.uuid),
      );

      // 4. 记录处理结果日志，方便后期追踪排查
      this.logger.log(
        `获取会议参与者成功: ${meetingId}, 共 ${unique.length} 个唯一参与者, ${raw.length} 个总参与者`,
      );

      // 返回处理完毕的数据，确保调用方可以同时拿到全量明细和去重汇总
      return { unique, raw };
    } catch (error: unknown) {
      // 记录警告级别的错误日志，防止底层 API 失败导致服务崩溃
      this.logger.warn(`获取会议参与者失败: ${meetingId}`, error);
      // 返回空数组，确保调用方不需要处理 null 或 undefined 引发的问题
      return {
        unique: [],
        raw: [],
      };
    }
  }
}
