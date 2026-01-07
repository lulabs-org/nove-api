import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingPlatform, MeetingType, ProcessingStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

/**
 * 会议记录查询DTO
 */
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
  @Transform(({ value }) => parseInt(String(value)))
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
  @Transform(({ value }) => parseInt(String(value)))
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

/**
 * 会议记录响应DTO
 */
export class MeetingRecordResponseDto {
  @ApiProperty({ description: '会议记录ID' })
  id: string;

  @ApiProperty({ description: '会议平台', enum: MeetingPlatform })
  platform: MeetingPlatform;

  @ApiProperty({ description: '平台会议ID' })
  meetingId: string; // 改为 meetingId

  @ApiPropertyOptional({ description: '子会议ID' })
  subMeetingId?: string | null;

  @ApiPropertyOptional({ description: '外部系统ID' })
  externalId?: string | null;

  @ApiProperty({ description: '会议标题' })
  title: string;

  @ApiPropertyOptional({ description: '会议描述' })
  description?: string | null;

  @ApiPropertyOptional({ description: '会议号' })
  meetingCode?: string | null;

  @ApiProperty({ description: '会议类型', enum: MeetingType })
  type: MeetingType;

  @ApiPropertyOptional({ description: '会议语言' })
  language?: string | null;

  @ApiPropertyOptional({ description: '标签' })
  tags?: string[];

  @ApiPropertyOptional({ description: '主持人平台用户ID' })
  hostPlatformUserId?: string | null;

  @ApiPropertyOptional({ description: '参会人数' })
  participantCount?: number | null;

  @ApiPropertyOptional({ description: '预定开始时间' })
  scheduledStartAt?: Date | null;

  @ApiPropertyOptional({ description: '预定结束时间' })
  scheduledEndAt?: Date | null;

  @ApiPropertyOptional({ description: '实际开始时间' })
  startAt?: Date | null;

  @ApiPropertyOptional({ description: '实际结束时间' })
  endAt?: Date | null;

  @ApiPropertyOptional({ description: '持续时间（秒）' })
  durationSeconds?: number | null;

  @ApiPropertyOptional({ description: '时区' })
  timezone?: string | null;

  @ApiProperty({ description: '是否有录制' })
  hasRecording: boolean;

  @ApiProperty({ description: '录制状态', enum: ProcessingStatus })
  recordingStatus: ProcessingStatus;

  @ApiProperty({ description: '处理状态', enum: ProcessingStatus })
  processingStatus: ProcessingStatus;

  @ApiPropertyOptional({ description: '元数据' })
  metadata?: any;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: '软删除时间' })
  deletedAt?: Date | null;
}

/**
 * 会议记录列表响应DTO
 */
export class MeetingRecordListResponseDto {
  @ApiProperty({
    description: '会议记录列表',
    type: [MeetingRecordResponseDto],
  })
  data: MeetingRecordResponseDto[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '当前页' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}

/**
 * 平台统计信息DTO
 */
export class PlatformStatsDto {
  @ApiProperty({ description: '平台名称', enum: MeetingPlatform })
  platform: MeetingPlatform;

  @ApiProperty({ description: '会议数量' })
  count: number;
}

/**
 * 状态统计信息DTO
 */
export class StatusStatsDto {
  @ApiProperty({ description: '处理状态', enum: ProcessingStatus })
  status: ProcessingStatus;

  @ApiProperty({ description: '会议数量' })
  count: number;
}

/**
 * 类型统计信息DTO
 */
export class TypeStatsDto {
  @ApiProperty({ description: '会议类型', enum: MeetingType })
  type: MeetingType;

  @ApiProperty({ description: '会议数量' })
  count: number;
}

/**
 * 会议统计信息响应DTO
 */
export class MeetingStatsResponseDto {
  @ApiProperty({ description: '总会议数' })
  total: number;

  @ApiProperty({
    description: '各平台会议数统计',
    type: [PlatformStatsDto],
  })
  platformStats: PlatformStatsDto[];

  @ApiProperty({
    description: '各状态会议数统计',
    type: [StatusStatsDto],
  })
  statusStats: StatusStatsDto[];

  @ApiProperty({
    description: '各类型会议数统计',
    type: [TypeStatsDto],
  })
  typeStats: TypeStatsDto[];

  @ApiProperty({
    description: '最近的会议记录',
    type: [MeetingRecordResponseDto],
  })
  recentMeetings: MeetingRecordResponseDto[];
}
