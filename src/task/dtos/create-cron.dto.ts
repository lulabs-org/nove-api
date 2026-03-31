/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-03 06:02:07
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-03 06:08:38
 * @FilePath: /lulab_backend/src/task/dtos/create-cron.dto.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

// src/tasks/dtos/create-cron.dto.ts
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateCronDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  cron!: string; // CRON 表达式

  @IsOptional()
  @IsString()
  timezone?: string; // 时区，例如 "Asia/Shanghai"，默认使用 'Asia/Shanghai'

  @IsObject()
  payload!: Record<string, unknown>;
}
