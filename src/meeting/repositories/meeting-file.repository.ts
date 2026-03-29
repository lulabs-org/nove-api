/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-17 21:09:15
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-29 20:43:26
 * @FilePath: /nove_api/src/meeting/repositories/meeting-file.repository.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateMeetingFileData,
  UpdateMeetingFileData,
} from '@/meeting/types';

@Injectable()
export class MeetingFileRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建会议文件
   */
  async create(data: CreateMeetingFileData) {
    return this.prisma.meetingRecordingFile.create({
      data,
    });
  }

  /**
   * 更新会议文件
   */
  async update(id: string, data: UpdateMeetingFileData) {
    return this.prisma.meetingRecordingFile.update({
      where: { id },
      data,
    });
  }
}
