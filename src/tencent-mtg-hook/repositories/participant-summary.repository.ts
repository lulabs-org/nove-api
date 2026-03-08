import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { GenerationMethod, PeriodType } from '@prisma/client';

@Injectable()
export class ParticipantSummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    periodType: PeriodType;
    platformUserId?: string;
    meetingId?: string;
    meetingRecordingId?: string;
    userName: string;
    partSummary: string;
    keywords?: string[];
    generatedBy?: GenerationMethod;
    aiModel?: string;
    confidence?: number;
    version?: number;
    isLatest?: boolean;
  }) {
    return this.prisma.participantSummary.create({
      data: {
        periodType: data.periodType,
        platformUserId: data.platformUserId,
        meetingId: data.meetingId,
        meetingRecordingId: data.meetingRecordingId,
        userName: data.userName,
        partSummary: data.partSummary,
        keywords: data.keywords || [],
        generatedBy: data.generatedBy || GenerationMethod.AI,
        aiModel: data.aiModel || 'tencent-meeting-ai',
        confidence: data.confidence,
        version: data.version || 1,
        isLatest: data.isLatest !== undefined ? data.isLatest : true,
      },
    });
  }

  async upsert(data: {
    periodType: PeriodType;
    platformUserId?: string;
    meetingId?: string;
    meetingRecordingId?: string;
    userName: string;
    partSummary: string;
    keywords?: string[];
    generatedBy?: GenerationMethod;
    aiModel?: string;
    confidence?: number;
    version?: number;
    isLatest?: boolean;
  }) {
    const existingSummary = await this.prisma.participantSummary.findFirst({
      where: {
        platformUserId: data.platformUserId,
        meetingId: data.meetingId,
        meetingRecordingId: data.meetingRecordingId,
        periodType: data.periodType,
        isLatest: true,
      },
    });

    if (existingSummary) {
      return this.prisma.participantSummary.update({
        where: { id: existingSummary.id },
        data: {
          partSummary: data.partSummary,
          keywords: data.keywords,
          generatedBy: data.generatedBy,
          aiModel: data.aiModel,
          confidence: data.confidence,
          updatedAt: new Date(),
        },
      });
    } else {
      return this.prisma.participantSummary.create({
        data: {
          periodType: data.periodType,
          platformUserId: data.platformUserId,
          meetingId: data.meetingId,
          meetingRecordingId: data.meetingRecordingId,
          userName: data.userName,
          partSummary: data.partSummary,
          keywords: data.keywords || [],
          generatedBy: data.generatedBy || GenerationMethod.AI,
          aiModel: data.aiModel || 'tencent-meeting-ai',
          confidence: data.confidence,
          version: data.version || 1,
          isLatest: data.isLatest !== undefined ? data.isLatest : true,
        },
      });
    }
  }

  async findByMeetingId(meetingId: string) {
    return this.prisma.participantSummary.findMany({
      where: {
        meetingId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByPlatformUserId(platformUserId: string) {
    return this.prisma.participantSummary.findMany({
      where: {
        platformUserId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByMeetingRecordingId(meetingRecordingId: string) {
    return this.prisma.participantSummary.findMany({
      where: {
        meetingRecordingId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
