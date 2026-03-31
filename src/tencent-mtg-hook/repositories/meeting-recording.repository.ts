import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RecordingSource, RecordingStatus, PrismaClient } from '@prisma/client';

type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class MeetingRecordingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(meetingId: string, externalId: string) {
    return this.prisma.meetingRecording.findFirst({
      where: {
        meetingId,
        externalId,
      },
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
      return this.prisma.meetingRecording.update({
        where: { id: existingRecording.id },
        data: {
          source: data.source,
          status: data.status,
          startAt: data.startAt,
          endAt: data.endAt,
        },
      });
    } else {
      return this.prisma.meetingRecording.create({
        data: {
          meetingId: data.meetingId,
          externalId: data.externalId,
          source: data.source || RecordingSource.PLATFORM_AUTO,
          status: data.status || RecordingStatus.COMPLETED,
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
    const recording = await tx.meetingRecording.findFirst({
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

    const newRecording = await tx.meetingRecording.create({
      data: {
        externalId: recordFileId,
        source: RecordingSource.PLATFORM_AUTO,
        status: RecordingStatus.COMPLETED,
        meetingId: existingMeetingId,
        metadata: {
          autoCreated: true,
        },
      },
    });

    return newRecording.id;
  }
}
