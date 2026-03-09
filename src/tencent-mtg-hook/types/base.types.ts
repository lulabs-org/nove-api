/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-31 16:30:49
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-09 14:05:42
 * @FilePath: /nove_api/src/tencent-mtg-hook/types/base.types.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { TencentMeetingType } from '../enums/tencent-base.enum';

export interface EventBase {
  trace_id: string;
  payload: unknown[];
}

export interface MeetingInfoBase {
  meeting_id: string;
  meeting_code: string;
  subject: string;
  meeting_type: TencentMeetingType;
  start_time: number;
  end_time: number;
}

export interface PayloadBase {
  operate_time: number;
}
