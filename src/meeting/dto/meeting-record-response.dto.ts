import {
  RecordingStatus,
  ProcessingStatus,
} from '../../minute/enums/status.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingPlatform, MeetingType, RecordingSource } from '@prisma/client';

export class MeetingHostResponseDto {
  @ApiProperty({ description: '平台用户 ID' })
  platformUserId: string;

  @ApiProperty({
    description: '主持人显示名称',
    type: String,
    nullable: true,
  })
  displayName: string | null;

  @ApiProperty({
    description: '已绑定的本地用户 ID',
    type: String,
    nullable: true,
  })
  userId: string | null;
}

export class MinuteSummaryResponseDto {
  @ApiProperty({ description: '录制记录 ID' })
  id: string;

  @ApiPropertyOptional({
    description: '平台录制 ID',
    type: String,
    nullable: true,
  })
  externalId?: string | null;

  @ApiProperty({ description: '录制来源', enum: RecordingSource })
  source: RecordingSource;

  @ApiPropertyOptional({
    description: '错误信息',
    type: String,
    nullable: true,
  })
  errorMessage?: string | null;
  @ApiPropertyOptional({
    description: '录制开始时间',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  startAt?: Date | null;

  @ApiPropertyOptional({
    description: '录制结束时间',
    type: String,
    format: 'date-time',
    nullable: true,
  })
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

  @ApiProperty({ description: '子会议ID', type: String })
  subMeetingId: string;

  @ApiPropertyOptional({
    description: '外部系统ID',
    type: String,
    nullable: true,
  })
  externalId?: string | null;

  @ApiProperty({ description: '会议标题' })
  title: string;

  @ApiPropertyOptional({
    description: '会议描述',
    type: String,
    nullable: true,
  })
  description?: string | null;

  @ApiPropertyOptional({
    description: '会议号',
    type: String,
    nullable: true,
  })
  meetingCode?: string | null;

  @ApiProperty({ description: '会议类型', enum: MeetingType })
  type: MeetingType;

  @ApiPropertyOptional({
    description: '会议语言',
    type: String,
    nullable: true,
  })
  language?: string | null;

  @ApiProperty({ description: '标签', type: [String] })
  tags: string[];

  @ApiProperty({
    description: '主持人信息',
    type: 'object',
    nullable: true,
    properties: {
      platformUserId: { type: 'string', description: '平台用户 ID' },
      displayName: {
        type: 'string',
        description: '主持人显示名称',
        nullable: true,
      },
      userId: {
        type: 'string',
        description: '已绑定的本地用户 ID',
        nullable: true,
      },
    },
  })
  host: MeetingHostResponseDto | null;

  @ApiPropertyOptional({
    description: '未删除的录制记录摘要（仅详情接口返回）',
    type: [MinuteSummaryResponseDto],
  })
  minutes?: MinuteSummaryResponseDto[];

  @ApiPropertyOptional({
    description: '参会人数',
    type: Number,
    nullable: true,
  })
  participantCount?: number | null;

  @ApiPropertyOptional({
    description: '预定开始时间',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  scheduledStartAt?: Date | null;

  @ApiPropertyOptional({
    description: '预定结束时间',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  scheduledEndAt?: Date | null;

  @ApiPropertyOptional({
    description: '实际开始时间',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  startAt?: Date | null;

  @ApiPropertyOptional({
    description: '实际结束时间',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  endAt?: Date | null;

  @ApiPropertyOptional({
    description: '持续时间（秒）',
    type: Number,
    nullable: true,
  })
  durationSeconds?: number | null;

  @ApiPropertyOptional({
    description: '时区',
    type: String,
    nullable: true,
  })
  timezone?: string | null;

  @ApiProperty({ description: '是否有录制' })
  hasRecording: boolean;

  @ApiProperty({ description: '录制状态', enum: RecordingStatus })
  recordingStatus: RecordingStatus;

  @ApiProperty({ description: '处理状态', enum: ProcessingStatus })
  processingStatus: ProcessingStatus;

  @ApiPropertyOptional({ description: '元数据' })
  metadata?: any;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: '软删除时间',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  deletedAt?: Date | null;
}

export class MeetingListItemResponseDto {
  @ApiProperty({ description: '会议记录ID' })
  id: string;

  @ApiProperty({ description: '会议标题' })
  title: string;

  @ApiProperty({ description: '会议平台', enum: MeetingPlatform })
  platform: MeetingPlatform;

  @ApiPropertyOptional({
    description: '实际开始时间',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  startAt?: Date | null;

  @ApiPropertyOptional({
    description: '实际结束时间',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  endAt?: Date | null;

  @ApiProperty({
    description: '主持人信息',
    type: 'object',
    nullable: true,
    properties: {
      platformUserId: { type: 'string', description: '平台用户 ID' },
      displayName: {
        type: 'string',
        description: '主持人显示名称',
        nullable: true,
      },
      userId: {
        type: 'string',
        description: '已绑定的本地用户 ID',
        nullable: true,
      },
    },
  })
  host: MeetingHostResponseDto | null;

  @ApiPropertyOptional({
    description: '参会人数',
    type: Number,
    nullable: true,
  })
  participantCount?: number | null;

  @ApiProperty({ description: '是否有未删除的录制' })
  hasRecording: boolean;
}

export class MeetingRecordListResponseDto {
  @ApiProperty({
    description: '会议记录列表',
    type: [MeetingListItemResponseDto],
  })
  data: MeetingListItemResponseDto[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '当前页' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}
