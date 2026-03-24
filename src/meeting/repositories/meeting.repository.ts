import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { GetMeetingRecordsParams } from '@/meeting/types';
import { MeetingRecordResponseDto } from '@/meeting/dto';

import { MeetingPlatform, Prisma } from '@prisma/client';

type UpdateMeetingRecordData = Prisma.MeetingUncheckedUpdateInput;
type CreateMeetingRecordData = Omit<
  Prisma.MeetingUncheckedCreateInput,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

@Injectable()
export class MeetingRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Find meeting record by platform and meeting ID
   */
  async findByPtId(
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
    return this.prisma.meeting.findUnique({
      where: { id, deletedAt: null },
      include: {
        recordings: true,
      },
    });
  }

  /**
   * Create meeting record
   */
  async create(data: CreateMeetingRecordData) {
    return this.prisma.meeting.create({
      data,
    });
  }

  /**
   * Update meeting record
   */
  async update(id: string, data: UpdateMeetingRecordData) {
    return this.prisma.meeting.update({
      where: { id, deletedAt: null },
      data,
    });
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
    return this.prisma.meeting.update({
      where: { id, deletedAt: null },
      data: {
        deletedAt: new Date(),
      },
    });
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
    records: MeetingRecordResponseDto[];
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

    const where: {
      platform?: typeof platform;
      processingStatus?: typeof status;
      type?: typeof type;
      startAt?: { gte?: Date; lte?: Date };
      OR?: Array<{ title?: { contains?: string; mode?: 'insensitive' } }>;
      deletedAt?: null;
    } = {
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
      where.OR = [{ title: { contains: search, mode: 'insensitive' } }];
    }

    const [records, total] = await Promise.all([
      this.prisma.meeting.findMany({
        where,
        include: {
          recordings: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.meeting.count({ where }),
    ]);

    return {
      records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
