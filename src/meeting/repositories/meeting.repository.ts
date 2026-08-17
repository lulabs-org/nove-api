import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { GetMeetingRecordsParams } from '@/meeting/types';

import { MeetingPlatform, Prisma } from '@prisma/client';
import type {
  MeetingHostResponseDto,
  MeetingListItemResponseDto,
  MeetingStatsResponseDto,
} from '../dto';

const meetingHostSelect = {
  id: true,
  displayName: true,
  localUserId: true,
} satisfies Prisma.PlatformUserSelect;

const meetingResponseSelect = {
  id: true,
  platform: true,
  meetingId: true,
  subMeetingId: true,
  externalId: true,
  title: true,
  description: true,
  meetingCode: true,
  type: true,
  language: true,
  tags: true,
  participantCount: true,
  scheduledStartAt: true,
  scheduledEndAt: true,
  startAt: true,
  endAt: true,
  durationSeconds: true,
  timezone: true,
  hasRecording: true,
  recordingStatus: true,
  processingStatus: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  host: {
    select: meetingHostSelect,
  },
  recordings: {
    where: { deletedAt: null },
    select: {
      id: true,
      externalId: true,
      source: true,
      status: true,
      startAt: true,
      endAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  _count: {
    select: {
      participants: { where: { deletedAt: null } },
    },
  },
} satisfies Prisma.MeetingSelect;

const meetingListSelect = {
  id: true,
  title: true,
  platform: true,
  startAt: true,
  endAt: true,
  participantCount: true,
  host: {
    select: meetingHostSelect,
  },
  _count: {
    select: {
      participants: { where: { deletedAt: null } },
      recordings: { where: { deletedAt: null } },
    },
  },
} satisfies Prisma.MeetingSelect;

type MeetingResponseRecord = Prisma.MeetingGetPayload<{
  select: typeof meetingResponseSelect;
}>;

type MeetingListRecord = Prisma.MeetingGetPayload<{
  select: typeof meetingListSelect;
}>;

type MeetingHostRecord = Prisma.PlatformUserGetPayload<{
  select: typeof meetingHostSelect;
}>;

type UpdateMeetingRecordData = Prisma.MeetingUncheckedUpdateInput;
type CreateMeetingRecordData = Omit<
  Prisma.MeetingUncheckedCreateInput,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

@Injectable()
export class MeetingRepository {
  constructor(private prisma: PrismaService) {}

  private toHostResponse(
    host: MeetingHostRecord | null,
  ): MeetingHostResponseDto | null {
    if (!host) return null;

    return {
      platformUserId: host.id,
      displayName: host.displayName ?? null,
      userId: host.localUserId ?? null,
    };
  }

  private toResponseRecord(
    record: MeetingResponseRecord,
    includeRecordings = true,
  ) {
    return {
      id: record.id,
      platform: record.platform,
      meetingId: record.meetingId,
      subMeetingId: record.subMeetingId,
      externalId: record.externalId,
      title: record.title,
      description: record.description,
      meetingCode: record.meetingCode,
      type: record.type,
      language: record.language,
      tags: record.tags,
      host: this.toHostResponse(record.host),
      participantCount: record.participantCount ?? record._count?.participants,
      scheduledStartAt: record.scheduledStartAt,
      scheduledEndAt: record.scheduledEndAt,
      startAt: record.startAt,
      endAt: record.endAt,
      durationSeconds: record.durationSeconds,
      timezone: record.timezone,
      hasRecording: record.recordings.length > 0,
      recordingStatus: record.recordingStatus,
      processingStatus: record.processingStatus,
      metadata: record.metadata,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
      ...(includeRecordings ? { recordings: record.recordings } : {}),
    };
  }

  private toListRecord(record: MeetingListRecord): MeetingListItemResponseDto {
    return {
      id: record.id,
      title: record.title,
      platform: record.platform,
      startAt: record.startAt,
      endAt: record.endAt,
      host: this.toHostResponse(record.host),
      participantCount: record.participantCount ?? record._count.participants,
      hasRecording: record._count.recordings > 0,
    };
  }

  /**
   * Find meeting record by platform and meeting ID
   */
  async findByPt(
    platform: MeetingPlatform,
    meetingId: string,
    subMeetingId: string,
  ) {
    return this.prisma.meeting.findUnique({
      where: {
        platform_meetingId_subMeetingId: {
          platform,
          meetingId,
          subMeetingId,
        },
        deletedAt: null,
      },
    });
  }

  /**
   * Find meeting record by ID
   */
  async findById(id: string) {
    const record = await this.prisma.meeting.findUnique({
      where: { id, deletedAt: null },
      select: meetingResponseSelect,
    });

    return record ? this.toResponseRecord(record) : null;
  }

  async exists(id: string): Promise<boolean> {
    const record = await this.prisma.meeting.findUnique({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    return record !== null;
  }

  /**
   * Create meeting record
   */
  async create(data: CreateMeetingRecordData) {
    const record = await this.prisma.meeting.create({
      data,
      select: meetingResponseSelect,
    });
    return this.toResponseRecord(record);
  }

  /**
   * Update meeting record
   */
  async update(id: string, data: UpdateMeetingRecordData) {
    const record = await this.prisma.meeting.update({
      where: { id, deletedAt: null },
      data,
      select: meetingResponseSelect,
    });
    return this.toResponseRecord(record);
  }

  /**
   * Upsert meeting record - create if not exists, update if exists
   */
  async upsert(
    platform: MeetingPlatform,
    meetingId: string,
    subMeetingId: string,
    data: Omit<
      CreateMeetingRecordData,
      'platform' | 'meetingId' | 'subMeetingId'
    >,
  ) {
    return this.prisma.meeting.upsert({
      where: {
        platform_meetingId_subMeetingId: {
          platform,
          meetingId,
          subMeetingId,
        },
        deletedAt: null,
      },
      update: data,
      create: {
        platform,
        meetingId,
        subMeetingId,
        ...data,
      },
    });
  }

  /**
   * Delete meeting record (hard delete)
   */
  async delete(id: string) {
    return this.prisma.meeting.delete({
      where: { id },
    });
  }

  /**
   * Soft delete meeting record
   */
  async softDelete(id: string) {
    const record = await this.prisma.meeting.update({
      where: { id, deletedAt: null },
      data: {
        deletedAt: new Date(),
      },
      select: meetingResponseSelect,
    });
    if (!record.deletedAt) {
      throw new Error(`Meeting ${id} was not marked as deleted`);
    }
    return {
      ...this.toResponseRecord(record),
      deletedAt: record.deletedAt,
    };
  }

  /**
   * Restore soft deleted meeting record
   */
  async restore(id: string) {
    return this.prisma.meeting.update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });
  }

  /**
   * Get meeting records list
   */
  async get(params: GetMeetingRecordsParams): Promise<{
    records: MeetingListItemResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      platform,
      status,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      search,
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.MeetingWhereInput = {
      deletedAt: null,
    };

    if (platform) {
      where.platform = platform;
    }

    if (status) {
      where.processingStatus = status;
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.startAt = {};
      if (startDate) {
        where.startAt.gte = startDate;
      }
      if (endDate) {
        where.startAt.lte = endDate;
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        {
          host: {
            displayName: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [records, total] = await Promise.all([
      this.prisma.meeting.findMany({
        where,
        select: meetingListSelect,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.meeting.count({ where }),
    ]);

    const listRecords = records.map((record) => this.toListRecord(record));

    return {
      records: listRecords,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats(params: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<MeetingStatsResponseDto> {
    const where: Prisma.MeetingWhereInput = {
      deletedAt: null,
      ...(params.startDate || params.endDate
        ? {
            startAt: {
              ...(params.startDate ? { gte: params.startDate } : {}),
              ...(params.endDate ? { lte: params.endDate } : {}),
            },
          }
        : {}),
    };

    const [total, platformGroups, statusGroups, typeGroups, recentRecords] =
      await Promise.all([
        this.prisma.meeting.count({ where }),
        this.prisma.meeting.groupBy({
          by: ['platform'],
          where,
          _count: { _all: true },
          orderBy: { platform: 'asc' },
        }),
        this.prisma.meeting.groupBy({
          by: ['processingStatus'],
          where,
          _count: { _all: true },
          orderBy: { processingStatus: 'asc' },
        }),
        this.prisma.meeting.groupBy({
          by: ['type'],
          where,
          _count: { _all: true },
          orderBy: { type: 'asc' },
        }),
        this.prisma.meeting.findMany({
          where,
          select: meetingResponseSelect,
          orderBy: { startAt: { sort: 'desc', nulls: 'last' } },
          take: 5,
        }),
      ]);

    return {
      total,
      platformStats: platformGroups.map((group) => ({
        platform: group.platform,
        count: group._count._all,
      })),
      statusStats: statusGroups.map((group) => ({
        status: group.processingStatus,
        count: group._count._all,
      })),
      typeStats: typeGroups.map((group) => ({
        type: group.type,
        count: group._count._all,
      })),
      recentMeetings: recentRecords.map((record) =>
        this.toResponseRecord(record, false),
      ),
    };
  }
}
