/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-09 14:04:49
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-22 02:00:45
 * @FilePath: /nove_api/src/integrations/tencent-meeting/types/base.types.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { ParticipantDetail } from '@/integrations/tencent-meeting/types';

/**
 * 腾讯会议参与者列表返回结果
 * 包含处理后的去重列表和未经去重处理的原始全量列表
 */
export interface ProcessedParticipants {
  /**
   * 去重后的参与者列表
   * 根据用户的唯一标识 (uuid) 去除了重复进出会议的记录，每个用户仅保留一条(通常为首次)参会记录
   */
  unique: ParticipantDetail[];

  /**
   * 原始的参与者全量列表
   * 包含腾讯会议 API 返回的所有参会流水记录(同一用户可能有多条记录)，其中的 user_name 字段已被 Base64 解码
   */
  raw: ParticipantDetail[];
}
