/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-03 06:02:24
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-03 06:08:53
 * @FilePath: /lulab_backend/src/task/dtos/update-task.dto.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

// src/tasks/dtos/update-task.dto.ts
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { TaskStatus } from '@prisma/client';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  cron?: string;

  @IsOptional()
  @IsString()
  timezone?: string; // 时区，例如 "Asia/Shanghai"

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
