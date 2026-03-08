/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-30 06:21:51
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-30 20:22:47
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/repositories/paragraph.repository.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PrismaTransaction } from '@/tencent-mtg-hook/types';

@Injectable()
export class ParagraphRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tx: PrismaTransaction,
    data: {
      pid: number;
      startTimeMs: bigint;
      endTimeMs: bigint;
      speakerId?: string;
      transcriptId: string;
    },
  ) {
    return tx.paragraph.create({
      data,
    });
  }

  async createMany(
    tx: PrismaTransaction,
    paragraphs: Array<{
      pid: number;
      startTimeMs: bigint;
      endTimeMs: bigint;
      speakerId?: string;
      transcriptId: string;
    }>,
  ) {
    return tx.paragraph.createMany({
      data: paragraphs,
      skipDuplicates: true,
    });
  }
}
