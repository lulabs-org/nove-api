import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingPlatform, MeetingType, ProcessingStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateMeetingRecordDto {
  @ApiProperty({
    description: '会议平台',
    enum: MeetingPlatform,
    example: MeetingPlatform.TENCENT_MEETING,
  })
  @IsNotEmpty({ message: '会议平台不能为空' })
  @IsEnum(MeetingPlatform, { message: '无效的会议平台' })
  platform: MeetingPlatform;

  @ApiProperty({
    description: '平台会议ID',
    example: 'meeting_123456',
  })
  @IsNotEmpty({ message: '平台会议ID不能为空' })
  @IsString({ message: '平台会议ID必须是字符串' })
  platformMeetingId: string;

  @ApiPropertyOptional({
    description: '平台录制ID',
    example: 'recording_123456',
  })
  @IsOptional()
  @IsString({ message: '平台录制ID必须是字符串' })
  platformRecordingId?: string;

  @ApiProperty({
    description: '会议标题',
    example: '项目讨论会议',
  })
  @IsNotEmpty({ message: '会议标题不能为空' })
  @IsString({ message: '会议标题必须是字符串' })
  title: string;

  @ApiPropertyOptional({
    description: '会议号',
    example: '123456789',
  })
  @IsOptional()
  @IsString({ message: '会议号必须是字符串' })
  meetingCode?: string;

  @ApiProperty({
    description: '会议类型',
    enum: MeetingType,
    example: MeetingType.SCHEDULED,
  })
  @IsNotEmpty({ message: '会议类型不能为空' })
  @IsEnum(MeetingType, { message: '无效的会议类型' })
  type: MeetingType;

  @ApiPropertyOptional({
    description: '主持人用户ID',
    example: 'user_123',
  })
  @IsOptional()
  @IsString({ message: '主持人用户ID必须是字符串' })
  hostUserId?: string;

  @ApiProperty({
    description: '主持人用户名',
    example: '张三',
  })
  @IsNotEmpty({ message: '主持人用户名不能为空' })
  @IsString({ message: '主持人用户名必须是字符串' })
  hostUserName: string;

  @ApiPropertyOptional({
    description: '实际开始时间',
    example: '2024-01-01T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: '实际开始时间格式不正确' })
  actualStartAt?: string;

  @ApiPropertyOptional({
    description: '结束时间',
    example: '2024-01-01T11:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: '结束时间格式不正确' })
  endedAt?: string;

  @ApiPropertyOptional({
    description: '持续时间（分钟）',
    example: 60,
    minimum: 0,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(String(value)))
  @IsNumber({}, { message: '持续时间必须是数字' })
  @Min(0, { message: '持续时间不能小于0' })
  duration?: number;

  @ApiPropertyOptional({
    description: '是否有录制',
    example: true,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  hasRecording?: boolean = false;

  @ApiPropertyOptional({
    description: '录制状态',
    enum: ProcessingStatus,
    example: ProcessingStatus.PENDING,
    default: ProcessingStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ProcessingStatus, { message: '无效的录制状态' })
  recordingStatus?: ProcessingStatus = ProcessingStatus.PENDING;

  @ApiPropertyOptional({
    description: '处理状态',
    enum: ProcessingStatus,
    example: ProcessingStatus.PENDING,
    default: ProcessingStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ProcessingStatus, { message: '无效的处理状态' })
  processingStatus?: ProcessingStatus = ProcessingStatus.PENDING;

  @ApiPropertyOptional({
    description: '元数据',
    example: { source: 'api' },
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
