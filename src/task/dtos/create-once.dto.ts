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
import { IsFutureDate } from '../../common/decorators';

export class CreateOnceDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsISO8601()
  @IsFutureDate({ message: '执行时间必须是未来的时间' })
  runAt!: string; // ISO 时间字符串

  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  jobIdHint?: string; // 业务期望的 jobId （可选）
}
