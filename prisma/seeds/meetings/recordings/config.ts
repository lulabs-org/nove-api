/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 03:34:11
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 03:34:12
 * @FilePath: /nove_api/prisma/seeds/mock/meetings/recordings/config.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { StorageProvider, RecordingFileType } from '@prisma/client';

export const RECORDING_FILE_CONFIGS = {
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
