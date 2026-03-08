/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-18 20:10:49
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-31 18:00:50
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/types/tencent-event.types.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import {
  TencentMeetingCreateMode,
  TencentMeetingCreateFrom,
  TencentMeetingEndType,
} from '../enums/tencent-base.enum';
import { EventBase, MeetingInfoBase, PayloadBase } from './base.types';

// 会议开始事件
export interface StartedEvent extends EventBase {
  event: 'meeting.started';
  payload: StartedPayload[];
}

export interface StartedPayload extends PayloadBase {
  operator: Meetuser;
  meeting_info: StartedMeetingInfo;
}

// export type MeetingMeetuser = Omit<TencentEventOperator, 'nick_name'>;

export interface StartedMeetingInfo extends MeetingInfoBase {
  creator: Meetuser;
  sub_meeting_id?: string;
  sub_meeting_start_time?: number;
  sub_meeting_end_time?: number;
  meeting_create_mode?: TencentMeetingCreateMode;
  meeting_create_from?: TencentMeetingCreateFrom;
}

export interface Meetuser {
  userid: string;
  user_name: string;
  uuid: string;
  instance_id: string;
  ms_open_id: string;
}

// 会议参与者加入事件
export interface ParticipantJoinedEvent extends EventBase {
  event: 'meeting.participant-joined';
  payload: ParticipantJoinedPayload[];
}

export interface ParticipantJoinedPayload extends PayloadBase {
  operator: Meetuser;
  meeting_info: StartedMeetingInfo;
}

// 会议参与者离开事件
export interface ParticipantLeftEvent extends EventBase {
  event: 'meeting.participant-left';
  payload: ParticipantLeftPayload[];
}

export interface ParticipantLeftPayload extends PayloadBase {
  operator: Meetuser;
  meeting_info: StartedMeetingInfo;
}

// 会议结束事件
export interface MeetingEndEvent extends EventBase {
  event: 'meeting.end';
  payload: MeetingEndPayload[];
}

export interface MeetingEndPayload extends PayloadBase {
  operator: Meetuser;
  meeting_info: StartedMeetingInfo;
  meeting_end_type: TencentMeetingEndType;
}

// 会议记录完成事件
export interface RecordingCompletedEvent extends EventBase {
  event: 'recording.completed';
  payload: RecordingCompletedPayload[];
}

export interface RecordingCompletedPayload extends PayloadBase {
  operator: Pick<Meetuser, 'instance_id'>;
  meeting_info: StartedMeetingInfo;
  recording_files: RecordingFile[];
}

// 智能会议纪要事件
export interface SmartFullSummaryEvent extends EventBase {
  event: 'smart.fullsummary';
  payload: SmartFullSummaryPayload[];
}
export interface SmartFullSummaryPayload extends PayloadBase {
  meeting_info: SmartFullSummaryMeetingInfo;
  recording_files: RecordingFile[];
}

export interface SmartFullSummaryMeetingInfo extends MeetingInfoBase {
  creator: Pick<Meetuser, 'uuid'>;
  meeting_create_mode?: TencentMeetingCreateMode;
  media_set_type?: number;
}

// 智能会议转写事件
export interface SmartTranscriptsEvent extends EventBase {
  event: 'smart.transcripts';
  payload: SmartTranscriptsPayload[];
  result: number;
}

export interface SmartTranscriptsPayload extends PayloadBase {
  meeting_info: SmartTranscriptsMeetingInfo;
  recording_files: RecordingFile[];
}

export interface SmartTranscriptsMeetingInfo extends MeetingInfoBase {
  creator: Pick<Meetuser, 'uuid'>;
  meeting_create_mode?: TencentMeetingCreateMode;
  media_set_type?: number;
}

// -----------------------------------------

export interface EventOperator {
  userid?: string;
  open_id?: string;
  uuid?: string;
  user_name?: string;
  nick_name?: string;
  ms_open_id?: string;
  instance_id: string;
}

export interface MeetingCreator {
  userid: string;
  uuid: string;
  user_name: string;
  ms_open_id?: string;
  instance_id?: string;
}

export interface RecordingFile {
  record_file_id: string;
  lang?: string;
}

export type TencentMeetingEvent =
  | StartedEvent
  | ParticipantJoinedEvent
  | ParticipantLeftEvent
  | MeetingEndEvent
  | RecordingCompletedEvent
  | SmartFullSummaryEvent
  | SmartTranscriptsEvent;

export type TencentEventPayload =
  | StartedPayload
  | ParticipantJoinedPayload
  | ParticipantLeftPayload
  | MeetingEndPayload
  | RecordingCompletedPayload
  | SmartFullSummaryPayload
  | SmartTranscriptsPayload;

export type TencentEventOperator = Meetuser;

export type TencentEventMeetingInfo = StartedMeetingInfo;

export type TencentMeetingCreator = Meetuser;

export type TencentMeetingInfoPayload = StartedPayload;

export type MeetingParticipantJoinedPayload = ParticipantJoinedPayload;

export type MeetingStartedPayload = StartedPayload;
