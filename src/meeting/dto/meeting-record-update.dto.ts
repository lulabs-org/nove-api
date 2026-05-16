import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingType, ProcessingStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class UpdateMeetingRecordDto {
  @ApiPropertyOptional({
    description: '会议标题',
    example: '项目讨论会议（已更新）',
  })
  @IsOptional()
  @IsString({ message: '会议标题必须是字符串' })
  title?: string;

  @ApiPropertyOptional({
    description: '会议号',
    example: '123456789',
  })
  @IsOptional()
  @IsString({ message: '会议号必须是字符串' })
  meetingCode?: string;

  @ApiPropertyOptional({
    description: '会议类型',
    enum: MeetingType,
    example: MeetingType.SCHEDULED,
  })
  @IsOptional()
  @IsEnum(MeetingType, { message: '无效的会议类型' })
  type?: MeetingType;

  @ApiPropertyOptional({
    description: '主持人用户ID',
    example: 'user_123',
  })
  @IsOptional()
  @IsString({ message: '主持人用户ID必须是字符串' })
  hostUserId?: string;

  @ApiPropertyOptional({
    description: '主持人用户名',
    example: '李四',
  })
  @IsOptional()
  @IsString({ message: '主持人用户名必须是字符串' })
  hostUserName?: string;

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
  @Transform(({ value }) => (value ? parseInt(String(value)) : undefined))
  @IsNumber({}, { message: '持续时间必须是数字' })
  @Min(0, { message: '持续时间不能小于0' })
  duration?: number;

  @ApiPropertyOptional({
    description: '录制状态',
    enum: ProcessingStatus,
    example: ProcessingStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(ProcessingStatus, { message: '无效的录制状态' })
  recordingStatus?: ProcessingStatus;

  @ApiPropertyOptional({
    description: '处理状态',
    enum: ProcessingStatus,
    example: ProcessingStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(ProcessingStatus, { message: '无效的处理状态' })
  processingStatus?: ProcessingStatus;

  @ApiPropertyOptional({
    description: '参会人数',
    example: 5,
    minimum: 0,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(String(value)) : undefined))
  @IsNumber({}, { message: '参会人数必须是数字' })
  @Min(0, { message: '参会人数不能小于0' })
  participantCount?: number;

  @ApiPropertyOptional({
    description: '参会者列表',
    example: [{ name: '张三', userId: 'user_123' }],
  })
  @IsOptional()
  participantList?: Record<string, unknown>[];

  @ApiPropertyOptional({
    description: '元数据',
    example: { updatedBy: 'admin' },
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
