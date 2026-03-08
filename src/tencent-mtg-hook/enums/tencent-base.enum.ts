/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-18 20:10:49
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-31 19:26:00
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/enums/tencent-base.enum.ts
 * @Description: 腾讯会议基础枚举定义
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

export enum TencentMeetingType {
  ONE_TIME = 0,
  RECURRING = 1,
  WECHAT_EXCLUSIVE = 2,
  ROOMS_SCREEN_SHARE = 4,
  PERSONAL_MEETING_ID = 5,
}

export enum TencentMeetingCreateMode {
  NORMAL = 0,
  QUICK = 1,
}

export enum TencentMeetingCreateFrom {
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

export enum TencentMeetingIdType {
  MAIN = 0,
  BREAKOUT = 1,
}

export enum TencentInstanceType {
  UNKNOWN = 0,
  PC = 1,
  MOBILE = 2,
  WEB = 3,
  ROOMS = 4,
  PHONE = 5,
  OUTDOOR = 6,
}

export enum TencentMeetingEndType {
  ACTIVE_END = 0,
  LAST_USER_LEAVE_AFTER_END = 1,
  NO_USER_AFTER_END = 2,
  NO_USER_BEFORE_END = 3,
}

export enum TencentMeetingEventType {
  MEETING_STARTED = 'meeting.started',
  MEETING_PARTICIPANT_JOINED = 'meeting.participant-joined',
  MEETING_PARTICIPANT_LEFT = 'meeting.participant-left',
  MEETING_END = 'meeting.end',
  RECORDING_COMPLETED = 'recording.completed',
  SMART_FULLSUMMARY = 'smart.fullsummary',
  SMART_TRANSCRIPTS = 'smart.transcripts',
}
