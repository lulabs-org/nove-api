import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
  IsInt,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GenerationMethod, ProcessingStatus } from '@prisma/client';

export class CreateMeetingSummaryDto {
  @ApiPropertyOptional({ description: '总结标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: '总结内容' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: '关键词' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'AI生成的会议纪要' })
  @IsOptional()
  @IsObject()
  aiMinutes?: any;

  @ApiPropertyOptional({ description: '关键要点' })
  @IsOptional()
  @IsObject()
  keyPoints?: any;

  @ApiPropertyOptional({ description: '行动项' })
  @IsOptional()
  @IsObject()
  actionItems?: any;

  @ApiPropertyOptional({ description: '决策记录' })
  @IsOptional()
  @IsObject()
  decisions?: any;

  @ApiPropertyOptional({ description: '扩展元数据' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateMeetingSummaryDto extends CreateMeetingSummaryDto {
  @ApiPropertyOptional({ description: '处理状态', enum: ProcessingStatus })
  @IsOptional()
  @IsEnum(ProcessingStatus)
  status?: ProcessingStatus;
}

export class QueryMeetingSummaryDto {
  @ApiPropertyOptional({
    description: '页码（从 1 开始）',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: '是否为最新版本' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '') return undefined;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as unknown;
  })
  isLatest?: boolean;

  @ApiPropertyOptional({ description: '状态', enum: ProcessingStatus })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  @IsEnum(ProcessingStatus)
  status?: ProcessingStatus;
}

export class MeetingSummaryDto {
  @ApiProperty({ description: '总结ID' })
  id: string;

  @ApiPropertyOptional({ description: '总结标题' })
  title?: string;

  @ApiProperty({ description: '总结内容' })
  content: string;

  @ApiPropertyOptional({ description: 'AI生成的结构化会议纪要' })
  aiMinutes?: any;

  @ApiPropertyOptional({ description: '关键要点' })
  keyPoints?: any;

  @ApiPropertyOptional({ description: '行动项' })
  actionItems?: any;

  @ApiPropertyOptional({ description: '决策记录' })
  decisions?: any;

  @ApiPropertyOptional({ description: '参与者总结' })
  speakerInsights?: any;

  @ApiPropertyOptional({ description: '会议金句' })
  goldenQuotes?: any;

  @ApiPropertyOptional({ description: '关键词' })
  keywords?: string[];

  @ApiPropertyOptional({ description: '元数据' })
  metadata?: any;

  @ApiPropertyOptional({ description: '状态', enum: ProcessingStatus })
  status?: ProcessingStatus;

  @ApiProperty({ description: '会议ID' })
  meetingId: string;

  @ApiPropertyOptional({ description: '录制ID' })
  recordingId?: string;

  @ApiPropertyOptional({ description: 'AI模型名称或版本' })
  aiModel?: string;

  @ApiPropertyOptional({ description: '生成方式', enum: GenerationMethod })
  generatedBy?: GenerationMethod;

  @ApiPropertyOptional({ description: '置信度' })
  confidence?: number;

  @ApiPropertyOptional({ description: '总结语言' })
  language?: string;

  @ApiProperty({ description: '版本号' })
  version: number;

  @ApiProperty({ description: '是否为最新版本' })
  isLatest: boolean;

  @ApiPropertyOptional({ description: '处理耗时（毫秒）' })
  processingTime?: number;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export class MeetingSummaryListResponseDto {
  @ApiProperty({ type: [MeetingSummaryDto], description: '总结列表' })
  data: MeetingSummaryDto[];

  @ApiProperty({ description: '总条数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页条数' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}
