/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-03 08:11:41
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-30 01:32:37
 * @FilePath: /nove_api/src/meeting/repositories/transcript.repository.ts
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
            speaker: true,
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

  async findDetails(recordingId: string) {
    return this.prisma.transcript.findFirst({
      where: { recordingId },
      include: {
        paragraphs: {
          include: {
            speaker: true,
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

  async findBySource(source: string) {
    return this.prisma.transcript.findFirst({
      where: { source },
    });
  }

  async upsert(data: {
    source: string;
    rawJson: Prisma.InputJsonValue;
    status: number;
    startedAt?: Date;
    finishedAt?: Date;
    recordingId: string;
  }) {
    const existingTranscript = await this.findByRecordingId(data.recordingId);

    if (existingTranscript) {
      return this.prisma.transcript.update({
        where: { id: existingTranscript.id },
        data: {
          source: data.source,
          rawJson: data.rawJson,
          status: data.status,
          startedAt: data.startedAt,
          finishedAt: data.finishedAt,
        },
      });
    } else {
      return this.prisma.transcript.create({
        data: {
          source: data.source,
          rawJson: data.rawJson,
          status: data.status,
          startedAt: data.startedAt,
          finishedAt: data.finishedAt,
          recordingId: data.recordingId,
        },
      });
    }
  }
}
