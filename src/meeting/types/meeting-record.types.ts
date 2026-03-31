/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-01 20:55:12
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-04 01:46:53
 * @FilePath: /lulab_backend/src/meeting/types/meeting-record.types.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { MeetingPlatform, MeetingType, ProcessingStatus } from '@prisma/client';

/**
 * 会议记录创建参数
 */
export interface CreateMeetingRecordParams {
  platform: MeetingPlatform;
  platformMeetingId: string;
  platformRecordingId: string;
  title: string;
  meetingCode: string;
  type: MeetingType;
  hostUserId: string;
  hostUserName: string;
  actualStartAt: Date;
  endedAt: Date;
  duration: number;
  hasRecording: boolean;
  recordingStatus: ProcessingStatus;
  processingStatus: ProcessingStatus;
  metadata?: any;
}

/**
 * 会议记录更新参数
 */
export interface UpdateMeetingRecordParams {
  recordingStatus?: ProcessingStatus;
  processingStatus?: ProcessingStatus;
  transcript?: string;
  summary?: string;
  participantCount?: number;
  participantList?: any;
}

/**
 * 会议记录查询参数
 */
export interface GetMeetingRecordsParams {
  platform?: MeetingPlatform;
  status?: ProcessingStatus;
  type?: MeetingType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  search?: string;
}
