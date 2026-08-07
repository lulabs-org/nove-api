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

@Injectable()
export class TranscriptRepository {
  constructor(private readonly prisma: PrismaService) { }

  // ==========================================
  // WRITE OPERATIONS
  // ==========================================

  async create(data: {
    source: string;
    rawFileUrl?: string;
    status: number;
    startedAt?: Date;
    finishedAt?: Date;
    recordingId: string;
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
      recordingId: string;
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
    recordingId: string;
  }) {
    const existingTranscript = await this.findByRecordingId(data.recordingId);

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
          recordingId: data.recordingId,
        },
      });
    }
  }

  async deleteSegments(transcriptId: string) {
    return this.prisma.transcriptSegment.deleteMany({
      where: { transcriptId },
    });
  }

  // ==========================================
  // READ OPERATIONS
  // ==========================================

  async findById(id: string) {
    return this.prisma.transcript.findUnique({
      where: { id },
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
        segments: {
          orderBy: {
            startTimeMs: 'asc',
          },
          include: {
            speaker: true,
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

  async countSegments(transcriptId: string) {
    return this.prisma.transcriptSegment.count({
      where: { transcriptId },
    });
  }
}
