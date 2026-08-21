import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDate,
  IsNumber,
  Min,
  Max,
  IsObject,
  IsNotEmpty,
  IsInt,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { RecordingSource, RecordingStatus } from '@prisma/client';
import { CreateMinuteSummaryDto } from './minute-summary.dto';

export class QueryMinuteDto {
  @ApiPropertyOptional({ description: '会议ID' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  @IsString()
  meetingId?: string;

  @ApiPropertyOptional({ description: '录音来源', enum: RecordingSource })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  @IsEnum(RecordingSource)
  source?: RecordingSource;

  @ApiPropertyOptional({ description: '状态', enum: RecordingStatus })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : (value as string)))
  @IsEnum(RecordingStatus)
  status?: RecordingStatus;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class CreateMinuteDto {
  @ApiProperty({ description: '会议ID' })
  @IsString()
  meetingId: string;

  @ApiPropertyOptional({ description: '外部系统录制ID' })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({ description: '录音来源', enum: RecordingSource })
  @IsOptional()
  @IsEnum(RecordingSource)
  source?: RecordingSource;

  @ApiPropertyOptional({ description: '状态', enum: RecordingStatus })
  @IsOptional()
  @IsEnum(RecordingStatus)
  status?: RecordingStatus;

  @ApiPropertyOptional({ description: '开始时间' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startAt?: Date;

  @ApiPropertyOptional({ description: '结束时间' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endAt?: Date;

  @ApiPropertyOptional({ description: '录制用户ID' })
  @IsOptional()
  @IsString()
  recorderUserId?: string;

  @ApiPropertyOptional({ description: '元数据' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateMinuteDto extends PartialType(CreateMinuteDto) {}

export class CreateRecordingSummaryDto extends CreateMinuteSummaryDto {
  @ApiProperty({ description: '外部 AI 生成的录制总结内容' })
  @IsString()
  @IsNotEmpty()
  declare content: string;

  @ApiPropertyOptional({
    description: '外部 AI 模型名称或版本',
    example: 'gpt-5',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  aiModel?: string;

  @ApiPropertyOptional({ description: '参与者总结' })
  @IsOptional()
  @IsArray()
  speakerInsights?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: '会议金句' })
  @IsOptional()
  @IsArray()
  goldenQuotes?: Record<string, unknown>[];
}

export class MinuteDto {
  @ApiProperty({ description: '录音ID' })
  id: string;

  @ApiPropertyOptional({ description: '外部系统录制ID' })
  externalId?: string;

  @ApiProperty({ description: '录音来源', enum: RecordingSource })
  source: RecordingSource;

  @ApiProperty({ description: '状态', enum: RecordingStatus })
  status: RecordingStatus;

  @ApiProperty({ description: '元数据' })
  metadata: any;

  @ApiProperty({ description: '会议ID' })
  meetingId: string;

  @ApiPropertyOptional({ description: '录制用户ID' })
  recorderUserId?: string;

  @ApiPropertyOptional({ description: '开始时间' })
  startAt?: Date;

  @ApiPropertyOptional({ description: '结束时间' })
  endAt?: Date;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: '删除时间' })
  deletedAt?: Date;
}

export class MinuteListResponseDto {
  @ApiProperty({ description: '列表数据', type: [MinuteDto] })
  data: any[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '当前页' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}

export class MinuteDeleteResponseDto {
  @ApiProperty({ description: '是否成功' })
  success: boolean;

  @ApiProperty({ description: '被删除的数据', type: MinuteDto })
  data: MinuteDto;

  @ApiProperty({ description: '删除时间' })
  deletedAt: Date;
}
