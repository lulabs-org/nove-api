import { RecordingStatus } from '../enums/status.enum';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RecordingSource, PrismaClient, Prisma } from '@prisma/client';
import type { Meeting } from '@prisma/client';

type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

type MinuteMeetingSummaryWithDeletedAt = Pick<
  Meeting,
  'id' | 'title' | 'platform' | 'startAt' | 'endAt' | 'deletedAt'
>;
type MinuteMeetingSummary = Omit<
  MinuteMeetingSummaryWithDeletedAt,
  'deletedAt'
>;

@Injectable()
export class MinuteRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly meetingSummary = {
    id: true,
    title: true,
    platform: true,
    startAt: true,
    endAt: true,
    deletedAt: true,
  } satisfies Prisma.MeetingSelect;

  private normalizeMeeting<
    T extends { meeting: MinuteMeetingSummaryWithDeletedAt | null },
  >(minute: T): Omit<T, 'meeting'> & { meeting: MinuteMeetingSummary | null } {
    const { meeting, ...record } = minute;
    if (!meeting || meeting.deletedAt) {
      return { ...record, meeting: null };
    }

    return {
      ...record,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        platform: meeting.platform,
        startAt: meeting.startAt,
        endAt: meeting.endAt,
      },
    };
  }

  async find(meetingId: string, externalId: string) {
    return this.prisma.minute.findFirst({
      where: {
        meetingId,
        externalId,
      },
    });
  }

  async findById(id: string) {
    const minute = await this.prisma.minute.findUnique({
      where: { id, deletedAt: null },
      omit: { deletedAt: true },
      include: {
        meeting: { select: this.meetingSummary },
      },
    });
    return minute ? this.normalizeMeeting(minute) : null;
  }

  async create(data: {
    meetingId: string;
    externalId?: string;
    source?: RecordingSource;
    status?: RecordingStatus;
    startAt?: Date;
    endAt?: Date;
    recorderUserId?: string;
    metadata?: any;
  }) {
    return this.prisma.minute.create({
      data: {
        meetingId: data.meetingId,
        externalId: data.externalId,
        startAt: data.startAt,
        endAt: data.endAt,
        recorderUserId: data.recorderUserId,
        source: data.source || RecordingSource.PLATFORM_AUTO,
        errorMessage: data.status === RecordingStatus.FAILED ? 'Failed' : null,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : {},
      },
    });
  }

  async findMany(query: {
    search?: string;
    meetingId?: string;
    source?: RecordingSource;
    skip: number;
    take: number;
  }) {
    const where: Prisma.MinuteWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              {
                externalId: {
                  contains: query.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                meeting: {
                  is: {
                    deletedAt: null,
                    title: {
                      contains: query.search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                },
              },
            ],
          }
        : {}),
      ...(query.meetingId ? { meetingId: query.meetingId } : {}),
      ...(query.source ? { source: query.source } : {}),
    };

    const [total, records] = await this.prisma.$transaction([
      this.prisma.minute.count({ where }),
      this.prisma.minute.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        omit: { deletedAt: true },
        include: {
          meeting: { select: this.meetingSummary },
        },
      }),
    ]);
    return {
      total,
      records: records.map((record) => this.normalizeMeeting(record)),
    };
  }

  async update(id: string, data: Prisma.MinuteUpdateInput) {
    return this.prisma.minute.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.minute.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async upsert(data: {
    meetingId: string;
    externalId: string;
    source?: RecordingSource;
    status?: RecordingStatus;
    startAt?: Date;
    endAt?: Date;
  }) {
    const existingRecording = await this.find(data.meetingId, data.externalId);

    if (existingRecording) {
      return this.prisma.minute.update({
        where: { id: existingRecording.id },
        data: {
          source: data.source,
          errorMessage:
            data.status === RecordingStatus.FAILED ? 'Failed' : null,
          startAt: data.startAt,
          endAt: data.endAt,
        },
      });
    } else {
      return this.prisma.minute.create({
        data: {
          meetingId: data.meetingId,
          externalId: data.externalId,
          source: data.source || RecordingSource.PLATFORM_AUTO,
          errorMessage:
            data.status === RecordingStatus.FAILED ? 'Failed' : null,
          startAt: data.startAt,
          endAt: data.endAt,
        },
      });
    }
  }

  async findOrCreateByExternalId(
    tx: PrismaTransaction,
    recordFileId: string,
    meetingId?: string,
    subMeetingId?: string,
  ): Promise<string> {
    const recording = await tx.minute.findFirst({
      where: {
        externalId: recordFileId,
      },
    });

    if (recording) {
      return recording.id;
    }

    const meetingIdToUse = meetingId;

    if (!meetingIdToUse) {
      throw new Error('Meeting ID is required when creating a new recording');
    }

    const meeting = await tx.meeting.findFirst({
      where: {
        platform: 'TENCENT_MEETING',
        meetingId: meetingIdToUse,
        subMeetingId: subMeetingId || '__ROOT__',
      },
    });

    if (!meeting) {
      throw new Error(
        `Meeting not found for meetingId: ${meetingIdToUse}, subMeetingId: ${subMeetingId || '__ROOT__'}`,
      );
    }

    const existingMeetingId = meeting.id;

    const newRecording = await tx.minute.create({
      data: {
        externalId: recordFileId,
        source: RecordingSource.PLATFORM_AUTO,
        meetingId: existingMeetingId,
        metadata: {
          autoCreated: true,
        },
      },
    });

    return newRecording.id;
  }
}
