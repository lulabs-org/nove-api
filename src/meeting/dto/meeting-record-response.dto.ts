import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingPlatform, MeetingType, ProcessingStatus } from '@prisma/client';

export class MeetingRecordResponseDto {
  @ApiProperty({ description: '会议记录ID' })
  id: string;

  @ApiProperty({ description: '会议平台', enum: MeetingPlatform })
  platform: MeetingPlatform;

  @ApiProperty({ description: '平台会议ID' })
  meetingId: string;

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
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: '软删除时间' })
  deletedAt?: Date | null;
}

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
