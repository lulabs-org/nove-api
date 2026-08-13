import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MeetingPlatform,
  MeetingType,
  ProcessingStatus,
  RecordingSource,
  RecordingStatus,
} from '@prisma/client';

export class MeetingHostResponseDto {
  @ApiProperty({ description: '平台用户 ID' })
  id: string;

  @ApiPropertyOptional({ description: '主持人显示名称', nullable: true })
  displayName?: string | null;
}

export class MeetingRecordingSummaryResponseDto {
  @ApiProperty({ description: '录制记录 ID' })
  id: string;

  @ApiPropertyOptional({ description: '平台录制 ID', nullable: true })
  externalId?: string | null;

  @ApiProperty({ description: '录制来源', enum: RecordingSource })
  source: RecordingSource;

  @ApiProperty({ description: '录制状态', enum: RecordingStatus })
  status: RecordingStatus;

  @ApiPropertyOptional({ description: '录制开始时间', nullable: true })
  startAt?: Date | null;

  @ApiPropertyOptional({ description: '录制结束时间', nullable: true })
  endAt?: Date | null;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

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

  @ApiPropertyOptional({
    description: '主持人信息',
    type: MeetingHostResponseDto,
    nullable: true,
  })
  host?: MeetingHostResponseDto | null;

  @ApiPropertyOptional({
    description: '未删除的录制记录摘要（仅详情接口返回）',
    type: [MeetingRecordingSummaryResponseDto],
  })
  recordings?: MeetingRecordingSummaryResponseDto[];

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
