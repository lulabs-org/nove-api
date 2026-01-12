/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-11 05:21:40
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 11:56:49
 * @FilePath: /nove_api/prisma/seeds/mock/meetings/recordings/recordings.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { PrismaClient, RecordingStatus, Prisma } from '@prisma/client';
import { RECORDING_FILE_CONFIGS } from './config';
import type { CreatedMeetingRecordings } from './type';

export async function createMeetingRecording(
  prisma: PrismaClient,
  meetings: {
    meetings: Array<{
      meeting: Prisma.MeetingGetPayload<Record<string, never>>;
    }>;
  },
  platformUsers: {
    platformUsers: Array<{
      key: string;
      platformUser: Prisma.PlatformUserGetPayload<Record<string, never>>;
    }>;
  },
): Promise<CreatedMeetingRecordings> {
  const fileConfig = RECORDING_FILE_CONFIGS.recording;

  const storageObject = await prisma.storageObject.upsert({
    where: {
      provider_bucket_objectKey: {
        provider: fileConfig.provider,
        bucket: fileConfig.bucket,
        objectKey: fileConfig.objectKey,
      },
    },
    update: {},
    create: {
      provider: fileConfig.provider,
      bucket: fileConfig.bucket,
      objectKey: fileConfig.objectKey,
      contentType: fileConfig.contentType,
      sizeBytes: fileConfig.sizeBytes,
    },
  });

  const meetingId = meetings.meetings[0].meeting.id;
  const recorderUserId = platformUsers.platformUsers[0].platformUser.id;

  let meetingRecording = await prisma.meetingRecording.findFirst({
    where: {
      meetingId: meetingId,
      recorderUserId: recorderUserId,
    },
  });

  if (!meetingRecording) {
    meetingRecording = await prisma.meetingRecording.create({
      data: {
        meetingId,
        startAt: new Date(),
        endAt: new Date(),
        status: RecordingStatus.COMPLETED,
        recorderUserId: recorderUserId,
      },
    });
  }

  let recordingFile = await prisma.meetingRecordingFile.findFirst({
    where: {
      recordingId: meetingRecording.id,
      fileObjectId: storageObject.id,
    },
  });

  if (!recordingFile) {
    recordingFile = await prisma.meetingRecordingFile.create({
      data: {
        recordingId: meetingRecording.id,
        fileObjectId: storageObject.id,
        fileType: fileConfig.fileType,
        durationMs: fileConfig.durationMs,
        resolution: fileConfig.resolution,
      },
    });
  }

  return { meetingRecording, recordingFile, storageObject };
}
