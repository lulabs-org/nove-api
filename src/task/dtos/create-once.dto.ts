/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-03 06:08:19
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-03 06:08:26
 * @FilePath: /lulab_backend/src/task/dtos/create-once.dto.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

// src/tasks/dtos/create-once.dto.ts
import {
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateOnceDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  handler!: string; // 任务处理器的名称 (例如 'invoke_http')

  @IsISO8601()
  runAt!: string; // ISO 时间字符串

  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  jobIdHint?: string; // 业务期望的 jobId （可选）
}
