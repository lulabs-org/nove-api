/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-21 20:15:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-21 21:09:59
 * @FilePath: /nove_api/src/tencent-mtg-hook/types/payload.types.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { MeetingEndType } from '../enums/tencent-mtg.enum';
import { PayloadBase } from './meet-base.types';
import { Meetuser } from './user.types';
import {
  MeetingSessionInfo,
  SmartFullSummaryMeetingInfo,
  SmartTranscriptsMeetingInfo,
} from './meeting-info.types';

export interface StartedPayload extends PayloadBase {
  operator: Meetuser;
  meeting_info: MeetingSessionInfo;
}

export interface ParticipantJoinedPayload extends PayloadBase {
  operator: Meetuser;
  meeting_info: MeetingSessionInfo;
}

export interface ParticipantLeftPayload extends PayloadBase {
  operator: Meetuser;
  meeting_info: MeetingSessionInfo;
}

export interface MeetingEndPayload extends PayloadBase {
  operator: Meetuser;
  meeting_info: MeetingSessionInfo;
  meeting_end_type: MeetingEndType;
}

export interface RecordingCompletedPayload extends PayloadBase {
  operator: Pick<Meetuser, 'instance_id'>;
  meeting_info: MeetingSessionInfo;
  recording_files: RecordingFile[];
}

export interface SmartFullSummaryPayload extends PayloadBase {
  meeting_info: SmartFullSummaryMeetingInfo;
  recording_files: RecordingFile[];
}

export interface SmartTranscriptsPayload extends PayloadBase {
  meeting_info: SmartTranscriptsMeetingInfo;
  recording_files: RecordingFile[];
}

export interface RecordingFile {
  record_file_id: string;
  lang?: string;
}

export type EventPayload =
  | StartedPayload
  | ParticipantJoinedPayload
  | ParticipantLeftPayload
  | MeetingEndPayload
  | RecordingCompletedPayload
  | SmartFullSummaryPayload
  | SmartTranscriptsPayload;
