/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-11 01:50:18
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-11 02:09:08
 * @FilePath: /nove_api/prisma/seeds/mock/meetings/recordings.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import {
  PrismaClient,
  StorageProvider,
  RecordingFileType,
  RecordingStatus,
  Prisma,
} from '@prisma/client';

const MEETING_FILE_CONFIGS = {
  recording: {
    provider: StorageProvider.LOCAL,
    bucket: 'recordings',
    objectKey: '2024/12/15/meeting_recording_20241215.mp4',
    contentType: 'video/mp4',
    sizeBytes: BigInt(524288000),
    fileType: RecordingFileType.VIDEO,
    durationMs: BigInt(3600000),
    resolution: '1920x1080',
  },
} as const;

export interface CreatedMeetingRecordings {
  recording: Prisma.MeetingRecordingGetPayload<Record<string, never>>;
}

export async function createTeamMeetingRecording(
  prisma: PrismaClient,
  meetingId: string,
  recorderUserId?: string,
) {
  const fileConfig = MEETING_FILE_CONFIGS.recording;

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
