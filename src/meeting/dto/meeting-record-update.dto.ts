import {
  IsString,
  IsOptional,
  IsEnum,
  IsDate,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingType } from '@prisma/client';
import { Type } from 'class-transformer';

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
    description:
      '实际开始时间（务必传入包含时区信息的 ISO 8601 格式，例如前端通过 date.toISOString() 生成）',
    example: '2024-01-01T10:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: '实际开始时间格式不正确' })
  actualStartAt?: Date;

  @ApiPropertyOptional({
    description:
      '结束时间（务必传入包含时区信息的 ISO 8601 格式，例如前端通过 date.toISOString() 生成）',
    example: '2024-01-01T11:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: '结束时间格式不正确' })
  endedAt?: Date;

  @ApiPropertyOptional({
    description: '持续时间（秒）',
    example: 3600,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '持续时间必须是整数' })
  @Min(0, { message: '持续时间不能小于0' })
  durationSeconds?: number;

  @ApiPropertyOptional({
    description: '参会人数',
    example: 5,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '参会人数必须是整数' })
  @Min(0, { message: '参会人数不能小于0' })
  participantCount?: number;

  @ApiPropertyOptional({
    description: '元数据',
    example: { updatedBy: 'admin' },
  })
  @IsOptional()
  metadata?: any;
}
