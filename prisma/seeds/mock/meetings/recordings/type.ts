/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 03:34:18
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 03:34:19
 * @FilePath: /nove_api/prisma/seeds/mock/meetings/recordings/type.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Prisma } from '@prisma/client';

export interface CreatedMeetingRecordings {
  meetingRecording: Prisma.MeetingRecordingGetPayload<Record<string, never>>;
  recordingFile: Prisma.MeetingRecordingFileGetPayload<Record<string, never>>;
  storageObject: Prisma.StorageObjectGetPayload<Record<string, never>>;
}
