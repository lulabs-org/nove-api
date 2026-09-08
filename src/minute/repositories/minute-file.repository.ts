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
import { FileVersionStatus } from '@prisma/client';
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

  /**
   * 查询 Minute 关联的所有有效云盘文件
   */
  async findAttachedFiles(minuteId: string) {
    return this.prisma.minuteFile.findMany({
      where: { minuteId, deletedAt: null, fileBindingId: { not: null } },
      orderBy: { createdAt: 'asc' },
      include: {
        fileBinding: {
          include: {
            file: {
              include: {
                node: true,
                versions: {
                  where: { status: FileVersionStatus.ACTIVE },
                  orderBy: { version: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * 根据云盘绑定 ID 查询 MinuteFile
   */
  async findByBindingId(fileBindingId: string) {
    return this.prisma.minuteFile.findUnique({
      where: { fileBindingId },
    });
  }
}
