/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-10 08:39:58
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-10 08:39:59
 * @FilePath: /nove_api/src/meeting/dto/meeting-record-query.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingPlatform, MeetingType, ProcessingStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class QueryMeetingRecordsDto {
  @ApiPropertyOptional({
    description: '会议平台',
    enum: MeetingPlatform,
    example: MeetingPlatform.TENCENT_MEETING,
  })
  @IsOptional()
  @IsEnum(MeetingPlatform)
  platform?: MeetingPlatform;

  @ApiPropertyOptional({
    description: '会议状态',
    enum: ProcessingStatus,
    example: ProcessingStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(ProcessingStatus)
  status?: ProcessingStatus;

  @ApiPropertyOptional({
    description: '会议类型',
    enum: MeetingType,
    example: MeetingType.SCHEDULED,
  })
  @IsOptional()
  @IsEnum(MeetingType)
  type?: MeetingType;

  @ApiPropertyOptional({
    description: '开始日期',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: '结束日期',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: '页码',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseInt(String(value)) : undefined))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseInt(String(value)) : undefined))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: '搜索关键词（会议主题、主持人等）',
    example: '项目讨论',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
