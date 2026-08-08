/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29 20:01:43
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-29 20:06:36
 * @FilePath: /nove_api/src/meet-ai/dto/meet-ai.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDate,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PeriodType } from '@prisma/client';

export class AnalyzeMeetingDto {
  @ApiProperty({ description: '会议ID' })
  @IsString()
  @IsNotEmpty()
  meetingId: string;
}

export class MeetingSummaryDto {
  @ApiProperty({ description: '会议ID' })
  meetingId: string;

  @ApiProperty({ description: '会议摘要' })
  summary: string;

  @ApiProperty({ description: '关键点', type: [String] })
  keyPoints: string[];

  @ApiProperty({ description: '行动项', type: [String] })
  actionItems: string[];
}

export class TriggerSummaryDto {
  @ApiProperty({
    description: '总结周期类型 (例如 DAILY, WEEKLY)',
    enum: PeriodType,
  })
  @IsEnum(PeriodType, { message: '无效的周期类型' })
  @IsNotEmpty({ message: 'periodType 不能为空' })
  periodType!: PeriodType;

  @ApiPropertyOptional({ description: '目标日期' })
  @IsOptional()
  @IsDate({ message: '无效的日期格式' })
  @Type(() => Date)
  targetDate?: Date;

  @ApiPropertyOptional({
    description: '指定生成总结的部分用户 (platformUserId 列表)',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'platformUserIds 必须是数组' })
  @IsString({ each: true, message: 'platformUserIds 数组必须包含字符串' })
  platformUserIds?: string[];
}

export class GenerateParticipantSummaryDto {
  @ApiProperty({ description: '记录ID' })
  @IsString()
  @IsNotEmpty()
  recordId: string;

  @ApiPropertyOptional({
    description: '指定生成总结的部分平台用户ID (不传则生成所有发过言的用户)',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'platformUserIds 必须是数组' })
  @IsString({ each: true, message: 'platformUserIds 数组必须包含字符串' })
  platformUserIds?: string[];
}
