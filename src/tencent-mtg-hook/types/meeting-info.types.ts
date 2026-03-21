/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-21 20:30:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-21 20:36:49
 * @FilePath: /nove_api/src/tencent-mtg-hook/types/meeting-info.types.ts
 * @Description: Meeting info type definitions
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import {
  MeetingCreateMode,
  MeetingCreateFrom,
} from '../enums/tencent-mtg.enum';
import { MeetingInfoBase } from './meet-base.types';
import { Meetuser } from './user.types';

export interface MeetingSessionInfo extends MeetingInfoBase {
  creator: Meetuser;
  sub_meeting_id?: string;
  sub_meeting_start_time?: number;
  sub_meeting_end_time?: number;
  meeting_create_mode?: MeetingCreateMode;
  meeting_create_from?: MeetingCreateFrom;
}

export interface SmartFullSummaryMeetingInfo extends MeetingInfoBase {
  creator: Pick<Meetuser, 'uuid'>;
  meeting_create_mode?: MeetingCreateMode;
  media_set_type?: number;
}

export interface SmartTranscriptsMeetingInfo extends MeetingInfoBase {
  creator: Pick<Meetuser, 'uuid'>;
  meeting_create_mode?: MeetingCreateMode;
  media_set_type?: number;
}
