import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { GenerationMethod } from '@prisma/client';

export class CreateSpeakerSummaryDto {
  @ApiProperty({
    description: '平台用户 ID',
    example: 'cmt4uz61o0000cc0dnqdq1lza',
  })
  @IsString()
  platformUserId: string;

  @ApiProperty({
    description: '总结正文',
    example: '张三在会议中汇报了上周的工作进展，并提出了下周的计划。',
  })
  @IsString()
  partSummary: string;

  @ApiPropertyOptional({
    description: '提取的关键词列表',
    type: [String],
    example: ['工作进展', '下周计划'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({
    description: '生成方式 (留空则默认为 MANUAL)',
    enum: GenerationMethod,
    example: GenerationMethod.AI,
  })
  @IsOptional()
  @IsEnum(GenerationMethod)
  generatedBy?: GenerationMethod;

  @ApiPropertyOptional({ description: '使用的 AI 模型', example: 'gpt-4o' })
  @IsOptional()
  @IsString()
  aiModel?: string;
}

export class UpdateSpeakerSummaryDto {
  @ApiPropertyOptional({
    description: '总结正文',
    example: '更新后的总结正文...',
  })
  @IsOptional()
  @IsString()
  partSummary?: string;

  @ApiPropertyOptional({
    description: '提取的关键词列表',
    type: [String],
    example: ['更新', '关键词'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({
    description: '生成方式',
    enum: GenerationMethod,
    example: GenerationMethod.AI,
  })
  @IsOptional()
  @IsEnum(GenerationMethod)
  generatedBy?: GenerationMethod;

  @ApiPropertyOptional({ description: '使用的 AI 模型', example: 'gpt-4o' })
  @IsOptional()
  @IsString()
  aiModel?: string;
}

export class QuerySpeakerSummaryDto {
  @ApiPropertyOptional({
    description: '页码',
    type: Number,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    type: Number,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class SpeakerSummaryDto {
  @ApiProperty({
    description: '总结记录唯一ID',
    example: 'cmt4uz6280004cc0d6valv3tj',
  })
  id: string;

  @ApiProperty({
    description: '所属录制记录ID',
    example: 'cmt4uz6230002cc0dkoq8r8d5',
  })
  minuteId: string;

  @ApiProperty({
    description: '平台用户ID',
    example: 'cmt4uz61o0000cc0dnqdq1lza',
  })
  platformUserId: string;

  @ApiProperty({
    description: '参会者总结正文',
    example: '张三在会议中汇报了上周的工作进展，并提出了下周的计划。',
  })
  partSummary: string;

  @ApiProperty({
    description: '总结提取的关键词',
    type: [String],
    example: ['工作进展', '下周计划'],
  })
  keywords: string[];

  @ApiPropertyOptional({
    description: '总结生成方式',
    enum: GenerationMethod,
    example: GenerationMethod.AI,
  })
  generatedBy?: GenerationMethod;

  @ApiPropertyOptional({
    description: '处理该总结的AI模型名称',
    example: 'tencent-meeting-ai',
  })
  aiModel?: string;

  @ApiProperty({ description: '记录创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '记录最后更新时间' })
  updatedAt: Date;
}

export class SpeakerSummaryListResponseDto {
  @ApiProperty({ description: '总结数据列表', type: [SpeakerSummaryDto] })
  data: SpeakerSummaryDto[];

  @ApiProperty({ description: '符合条件的总记录数', example: 1 })
  total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页条数', example: 20 })
  limit: number;

  @ApiProperty({ description: '总页数', example: 1 })
  totalPages: number;
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
