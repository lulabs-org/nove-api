import { ProcessingStatus } from '../../minute/enums/status.enum';
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

import { MeetingPlatform, MeetingType } from '@prisma/client';

/**
 * 会议记录创建参数
 */
export interface CreateMeetingRecordParams {
  platform: MeetingPlatform;
  platformMeetingId: string;
  title: string;
  meetingCode: string;
  type: MeetingType;
  hostUserId: string;
  actualStartAt: Date;
  endedAt: Date;
  durationSeconds: number;
  metadata?: any;
}

/**
 * 会议记录更新参数
 */
export interface UpdateMeetingRecordParams {
  transcript?: string;
  summary?: string;
  participantCount?: number;
}

/**
 * 会议记录查询参数
 */
export interface GetMeetingRecordsParams {
  orgId?: string;
  platform?: MeetingPlatform;
  status?: ProcessingStatus;
  type?: MeetingType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  search?: string;
}

export type SummarySegment = {
  startTimeMs: bigint;
  speakerName: string | null;
  text: string;
  speaker: { id: string; displayName: string | null } | null;
};
