/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-18 20:10:49
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-21 19:36:09
 * @FilePath: /nove_api/src/tencent-mtg-hook/enums/tencent-mtg.enum.ts
 * @Description: 腾讯会议基础枚举定义
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

export enum MeetingType {
  ONE_TIME = 0,
  RECURRING = 1,
  WECHAT_EXCLUSIVE = 2,
  ROOMS_SCREEN_SHARE = 4,
  PERSONAL_MEETING_ID = 5,
}

export enum MeetingCreateMode {
  NORMAL = 0,
  QUICK = 1,
}

export enum MeetingCreateFrom {
  EMPTY = 0,
  CLIENT = 1,
  WEB = 2,
  WECHAT_WORK = 3,
  WECHAT = 4,
  OUTLOOK = 5,
  REST_API = 6,
  TENCENT_DOCS = 7,
  ROOMS_SMART_RECORDING = 8,
}

export enum MeetingIdType {
  MAIN = 0,
  BREAKOUT = 1,
}

export enum InstanceType {
  UNKNOWN = 0,
  PC = 1,
  MOBILE = 2,
  WEB = 3,
  ROOMS = 4,
  PHONE = 5,
  OUTDOOR = 6,
}

export enum MeetingEndType {
  ACTIVE_END = 0,
  LAST_USER_LEAVE_AFTER_END = 1,
  NO_USER_AFTER_END = 2,
  NO_USER_BEFORE_END = 3,
}

export enum MeetingEventType {
  MEETING_STARTED = 'meeting.started',
  MEETING_PARTICIPANT_JOINED = 'meeting.participant-joined',
  MEETING_PARTICIPANT_LEFT = 'meeting.participant-left',
  MEETING_END = 'meeting.end',
  RECORDING_COMPLETED = 'recording.completed',
  SMART_FULLSUMMARY = 'smart.fullsummary',
  SMART_TRANSCRIPTS = 'smart.transcripts',
}
