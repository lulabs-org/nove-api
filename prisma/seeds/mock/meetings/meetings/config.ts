/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 02:41:47
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 11:32:56
 * @FilePath: /nove_api/prisma/seeds/mock/meetings/meetings/config.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { MeetingPlatform, MeetingType, ProcessingStatus } from '@prisma/client';
import type { MeetingConfig } from './type';

const createTime = (hoursAgo: number): Date => {
  const now = new Date();
  return new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
};

export const MEETING_CONFIGS: readonly MeetingConfig[] = [
  {
    platform: MeetingPlatform.TENCENT_MEETING,
    meetingId: '14828776902617556364',
    subMeetingId: '__ROOT__',
    title: 'L5项目例会',
    description: 'L5项目周期性例会，讨论项目进度和技术问题',
    meetingCode: '148-287-769',
    type: MeetingType.SCHEDULED,
    tags: ['项目例会', '研发', 'L5'],
    language: 'zh-CN',
    durationSeconds: 3600,
    participantCount: 15,
    hasRecording: true,
    recordingStatus: ProcessingStatus.COMPLETED,
    processingStatus: ProcessingStatus.COMPLETED,
    timezone: 'Asia/Shanghai',
    scheduledStartAt: createTime(2),
    scheduledEndAt: createTime(1),
    startAt: createTime(2),
    endAt: createTime(1),
  },
  {
    platform: MeetingPlatform.TENCENT_MEETING,
    meetingId: '1366034376294456216',
    subMeetingId: '__ROOT__',
    title: '陈怡瑞会员对接会',
    description: '会员对应接洽与需求沟通',
    meetingCode: '136-603-437',
    type: MeetingType.SCHEDULED,
    tags: ['会员对接', '需求沟通'],
    language: 'zh-CN',
    durationSeconds: 3600,
    participantCount: 5,
    hasRecording: true,
    recordingStatus: ProcessingStatus.COMPLETED,
    processingStatus: ProcessingStatus.COMPLETED,
    timezone: 'Asia/Shanghai',
    scheduledStartAt: createTime(2),
    scheduledEndAt: createTime(1),
    startAt: createTime(2),
    endAt: createTime(1),
  },
  {
    platform: MeetingPlatform.TENCENT_MEETING,
    meetingId: '11596879021002786213',
    subMeetingId: '__ROOT__',
    title: 'AI俱乐部（level2&level1）',
    description: 'AI俱乐部课程培训与交流',
    meetingCode: '115-968-790',
    type: MeetingType.WEBINAR,
    tags: ['培训', 'AI俱乐部', '教育'],
    language: 'zh-CN',
    durationSeconds: 3600,
    participantCount: 50,
    hasRecording: true,
    recordingStatus: ProcessingStatus.COMPLETED,
    processingStatus: ProcessingStatus.COMPLETED,
    timezone: 'Asia/Shanghai',
    scheduledStartAt: createTime(2),
    scheduledEndAt: createTime(1),
    startAt: createTime(2),
    endAt: createTime(1),
  },
  {
    platform: MeetingPlatform.TENCENT_MEETING,
    meetingId: '5228964612202836078',
    subMeetingId: '__ROOT__',
    title: '杨仕明的快速会议',
    description: '临时快速会议交流',
    meetingCode: '522-896-461',
    type: MeetingType.INSTANT,
    tags: ['快速会议', '临时沟通'],
    language: 'zh-CN',
    durationSeconds: 3600,
    participantCount: 3,
    hasRecording: true,
    recordingStatus: ProcessingStatus.COMPLETED,
    processingStatus: ProcessingStatus.COMPLETED,
    timezone: 'Asia/Shanghai',
    scheduledStartAt: createTime(2),
    scheduledEndAt: createTime(1),
    startAt: createTime(2),
    endAt: createTime(1),
  },
] as const;
