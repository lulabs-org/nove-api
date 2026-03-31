import { ApiProperty } from '@nestjs/swagger';
import { MeetingPlatform, MeetingType, ProcessingStatus } from '@prisma/client';
import { MeetingRecordResponseDto } from './meeting-record-response.dto';

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
