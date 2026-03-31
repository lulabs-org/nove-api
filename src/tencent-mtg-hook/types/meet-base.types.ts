/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-31 16:30:49
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-21 20:06:49
 * @FilePath: /nove_api/src/tencent-mtg-hook/types/meet-base.types.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { MeetingType } from '../enums/tencent-mtg.enum';

export interface EventBase {
  trace_id: string;
  payload: unknown[];
}

export interface MeetingInfoBase {
  meeting_id: string;
  meeting_code: string;
  subject: string;
  meeting_type: MeetingType;
  start_time: number;
  end_time: number;
}

export interface PayloadBase {
  operate_time: number;
}
