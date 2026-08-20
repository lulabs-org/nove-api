/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-11 05:21:40
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 11:56:49
 * @FilePath: /nove_api/prisma/seeds/mock/meetings/minutes/minutes.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { PrismaClient, RecordingStatus, Prisma } from '@prisma/client';
import { MINUTE_FILE_CONFIGS } from './config';
import type { CreatedMinute } from './type';

export async function createMinute(
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
): Promise<CreatedMinute> {
  const fileConfig = MINUTE_FILE_CONFIGS.recording;

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

  let minute = await prisma.minute.findFirst({
    where: {
      meetingId: meetingId,
      recorderUserId: recorderUserId,
    },
  });

  if (!minute) {
    minute = await prisma.minute.create({
      data: {
        meetingId,
        startAt: new Date(),
        endAt: new Date(),
        status: RecordingStatus.COMPLETED,
        recorderUserId: recorderUserId,
      },
    });
  }

  let minuteFile = await prisma.minuteFile.findFirst({
    where: {
      minuteId: minute.id,
      fileObjectId: storageObject.id,
    },
  });

  if (!minuteFile) {
    minuteFile = await prisma.minuteFile.create({
      data: {
        minuteId: minute.id,
        fileObjectId: storageObject.id,
        fileType: fileConfig.fileType,
        durationMs: fileConfig.durationMs,
        resolution: fileConfig.resolution,
      },
    });
  }

  return { minute, minuteFile, storageObject };
}
