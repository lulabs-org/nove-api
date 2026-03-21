/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-18 20:10:49
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-21 20:33:55
 * @FilePath: /nove_api/src/tencent-mtg-hook/types/tencent-event.types.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { EventBase } from './meet-base.types';
import {
  StartedPayload,
  ParticipantJoinedPayload,
  ParticipantLeftPayload,
  MeetingEndPayload,
  RecordingCompletedPayload,
  SmartFullSummaryPayload,
  SmartTranscriptsPayload,
} from './payload.types';

// 会议开始事件
export interface StartedEvent extends EventBase {
  event: 'meeting.started';
  payload: StartedPayload[];
}

// 会议参与者加入事件
export interface ParticipantJoinedEvent extends EventBase {
  event: 'meeting.participant-joined';
  payload: ParticipantJoinedPayload[];
}

// 会议参与者离开事件
export interface ParticipantLeftEvent extends EventBase {
  event: 'meeting.participant-left';
  payload: ParticipantLeftPayload[];
}

// 会议结束事件
export interface MeetingEndEvent extends EventBase {
  event: 'meeting.end';
  payload: MeetingEndPayload[];
}

// 会议记录完成事件
export interface RecordingCompletedEvent extends EventBase {
  event: 'recording.completed';
  payload: RecordingCompletedPayload[];
}

// 智能会议纪要事件
export interface SmartFullSummaryEvent extends EventBase {
  event: 'smart.fullsummary';
  payload: SmartFullSummaryPayload[];
}

// 智能会议转写事件
export interface SmartTranscriptsEvent extends EventBase {
  event: 'smart.transcripts';
  payload: SmartTranscriptsPayload[];
  result: number;
}

export type TencentMeetingEvent =
  | StartedEvent
  | ParticipantJoinedEvent
  | ParticipantLeftEvent
  | MeetingEndEvent
  | RecordingCompletedEvent
  | SmartFullSummaryEvent
  | SmartTranscriptsEvent;
