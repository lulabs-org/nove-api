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
import { TrackingCadence } from '@prisma/client';

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


export class GenerateParticipantSummaryDto {
  @ApiPropertyOptional({
    description: '指定生成总结的部分平台用户ID (不传则生成所有发过言的用户)',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'platformUserIds 必须是数组' })
  @IsString({ each: true, message: 'platformUserIds 数组必须包含字符串' })
  platformUserIds?: string[];
}
