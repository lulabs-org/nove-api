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
import { PrismaTransaction } from '@/tencent-mtg/types';

@Injectable()
export class TranscriptRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // WRITE OPERATIONS
  // ==========================================

  async create(data: {
    source: string;
    rawFileUrl?: string;
    status: number;
    startedAt?: Date;
    finishedAt?: Date;
    minuteId: string;
  }) {
    return this.prisma.transcript.create({
      data,
    });
  }

  async create_tx(
    tx: PrismaTransaction,
    data: {
      source: string;
      rawFileUrl?: string;
      status: number;
      startedAt?: Date;
      finishedAt?: Date;
      minuteId: string;
    },
  ) {
    return tx.transcript.create({
      data,
    });
  }

  async upsert(data: {
    source: string;
    rawFileUrl?: string;
    status: number;
    startedAt?: Date;
    finishedAt?: Date;
    minuteId: string;
  }) {
    const existingTranscript = await this.findByRecordingId(data.minuteId);

    if (existingTranscript) {
      return this.prisma.transcript.update({
        where: { id: existingTranscript.id },
        data: {
          source: data.source,
          rawFileUrl: data.rawFileUrl,
          status: data.status,
          startedAt: data.startedAt,
          finishedAt: data.finishedAt,
        },
      });
    } else {
      return this.prisma.transcript.create({
        data: {
          source: data.source,
          rawFileUrl: data.rawFileUrl,
          status: data.status,
          startedAt: data.startedAt,
          finishedAt: data.finishedAt,
          minuteId: data.minuteId,
        },
      });
    }
  }

  async deleteSegments(transcriptId: string) {
    return this.prisma.transcriptSegment.deleteMany({
      where: { transcriptId },
    });
  }

  async delete(id: string) {
    return this.prisma.transcript.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ==========================================
  // READ OPERATIONS
  // ==========================================

  async findById(id: string) {
    return this.prisma.transcript.findUnique({
      where: { id, deletedAt: null },
      include: {
        segments: {
          orderBy: {
            startTimeMs: 'asc',
          },
          include: {
            speaker: true,
          },
        },
      },
      omit: { deletedAt: true },
    });
  }

  async findMany(skip: number = 0, take: number = 10, minuteId?: string) {
    const where = {
      deletedAt: null,
      ...(minuteId ? { minuteId } : {}),
    };

    const [total, records] = await this.prisma.$transaction([
      this.prisma.transcript.count({ where }),
      this.prisma.transcript.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        omit: { deletedAt: true },
      }),
    ]);
    return { total, records };
  }

  async findByRecordingId(minuteId: string) {
    return this.prisma.transcript.findFirst({
      where: { minuteId },
      omit: { deletedAt: true },
    });
  }

  async findDetails(minuteId: string) {
    return this.prisma.transcript.findFirst({
      where: { minuteId, deletedAt: null },
      include: {
        segments: {
          orderBy: {
            startTimeMs: 'asc',
          },
          include: {
            speaker: true,
          },
        },
      },
      omit: { deletedAt: true },
    });
  }

  async findBySource(source: string) {
    return this.prisma.transcript.findFirst({
      where: { source },
      omit: { deletedAt: true },
    });
  }

  async countSegments(transcriptId: string) {
    return this.prisma.transcriptSegment.count({
      where: { transcriptId },
    });
  }
}
