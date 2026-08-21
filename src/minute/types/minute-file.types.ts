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
import { RecordingFileType } from '@prisma/client';

/**
 * 会议文件创建参数
 */
export interface CreateMinuteFileParams {
  minuteId: string;
  fileObjectId: string;
  fileType: RecordingFileType;
  durationMs?: number | bigint;
  resolution?: string;
}

// Repository-layer alias for creating meeting file
export type CreateMinuteFileData = CreateMinuteFileParams;

/**
 * 仓储层：会议文件更新数据
 */
export interface UpdateMinuteFileData {
  fileObjectId?: string;
  fileType?: RecordingFileType;
  durationMs?: number | bigint;
  resolution?: string;
}
