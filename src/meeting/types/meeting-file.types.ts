/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-17 21:43:18
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-17 21:43:19
 * @FilePath: /lulab_backend/src/meeting/types/meeting-file.types.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */
import { RecordingFileType } from '@/generated/prisma/client';

/**
 * 会议文件创建参数
 */
export interface CreateMeetingFileParams {
  recordingId: string;
  fileObjectId: string;
  fileType: RecordingFileType;
  durationMs?: number | bigint;
  resolution?: string;
}

// Repository-layer alias for creating meeting file
export type CreateMeetingFileData = CreateMeetingFileParams;

/**
 * 仓储层：会议文件更新数据
 */
export interface UpdateMeetingFileData {
  fileObjectId?: string;
  fileType?: RecordingFileType;
  durationMs?: number | bigint;
  resolution?: string;
}
