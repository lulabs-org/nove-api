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
import type { CreateMinuteFileData, UpdateMinuteFileData } from '../types';

@Injectable()
export class MinuteFileRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建会议文件
   */
  async create(data: CreateMinuteFileData) {
    return this.prisma.minuteFile.create({
      data,
    });
  }

  /**
   * 更新会议文件
   */
  async update(id: string, data: UpdateMinuteFileData) {
    return this.prisma.minuteFile.update({
      where: { id },
      data,
    });
  }
}
