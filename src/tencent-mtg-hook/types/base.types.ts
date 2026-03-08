/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-31 16:30:49
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-31 19:24:39
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/types/base.types.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { TencentMeetingType } from '../enums/tencent-base.enum';
import { MeetingParticipantDetail } from '@/integrations/tencent-meeting/types';

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

export interface MeetingParticipantsResult {
  uniqueParticipants: MeetingParticipantDetail[];
  allParticipants: MeetingParticipantDetail[];
}
