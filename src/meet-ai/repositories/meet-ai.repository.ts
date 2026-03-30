/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29 20:01:15
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-30 14:09:29
 * @FilePath: /nove_api/src/meet-ai/repositories/meet-ai.repository.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MeetAiRepository {
  constructor(private prisma: PrismaService) {}

  analyzeMeeting(meetingId: string) {
    return {
      meetingId,
      status: 'analyzing',
      message: '会议分析已启动',
    };
  }

  getMeetingSummary(meetingId: string) {
    return {
      meetingId,
      summary: '会议摘要',
      keyPoints: ['关键点1', '关键点2', '关键点3'],
      actionItems: ['行动项1', '行动项2'],
    };
  }
}
