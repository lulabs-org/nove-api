/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-03 08:11:41
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-04 03:14:32
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/repositories/transcript.repository.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PrismaTransaction } from '@/tencent-mtg-hook/types';
import { Prisma } from '@prisma/client';

@Injectable()
export class TranscriptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create_tx(
    tx: PrismaTransaction,
    data: {
      source: string;
      rawJson: Prisma.InputJsonValue;
      status: number;
      startedAt?: Date;
      finishedAt?: Date;
      recordingId: string;
    },
  ) {
    return tx.transcript.create({
      data,
    });
  }

  async create(data: {
    source: string;
    rawJson: Prisma.InputJsonValue;
    status: number;
    startedAt?: Date;
    finishedAt?: Date;
    recordingId: string;
  }) {
    return this.prisma.transcript.create({
      data,
    });
  }

  async findById(id: string) {
    return this.prisma.transcript.findUnique({
      where: { id },
      include: {
        paragraphs: {
          include: {
            sentences: {
              include: {
                words: true,
              },
            },
          },
        },
      },
    });
  }

  async findByRecordingId(recordingId: string) {
    return this.prisma.transcript.findFirst({
      where: { recordingId },
    });
  }

  async findBySource(source: string) {
    return this.prisma.transcript.findFirst({
      where: { source },
    });
  }
}
