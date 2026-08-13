import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, Matches } from 'class-validator';
import { MeetingPlatform, MeetingType, ProcessingStatus } from '@prisma/client';
import { MeetingRecordResponseDto } from './meeting-record-response.dto';

export class QueryMeetingStatsDto {
  @ApiPropertyOptional({
    description: '统计开始时间（包含时区的 ISO 8601 时间）',
    example: '2026-08-01T00:00:00.000+08:00',
  })
  @IsOptional()
  @IsDateString({}, { message: 'startDate 必须是有效的 ISO 8601 时间' })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'startDate 必须包含时区信息',
  })
  startDate?: string;

  @ApiPropertyOptional({
    description: '统计结束时间（包含时区的 ISO 8601 时间）',
    example: '2026-08-31T23:59:59.999+08:00',
  })
  @IsOptional()
  @IsDateString({}, { message: 'endDate 必须是有效的 ISO 8601 时间' })
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'endDate 必须包含时区信息',
  })
  endDate?: string;
}

export class PlatformStatsDto {
  @ApiProperty({ description: '平台名称', enum: MeetingPlatform })
  platform: MeetingPlatform;

  @ApiProperty({ description: '会议数量' })
  count: number;
}

export class StatusStatsDto {
  @ApiProperty({ description: '处理状态', enum: ProcessingStatus })
  status: ProcessingStatus;

  @ApiProperty({ description: '会议数量' })
  count: number;
}

export class TypeStatsDto {
  @ApiProperty({ description: '会议类型', enum: MeetingType })
  type: MeetingType;

  @ApiProperty({ description: '会议数量' })
  count: number;
}

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
