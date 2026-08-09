import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDate, IsNumber, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { RecordingSource, RecordingStatus } from '@prisma/client';

export class QueryMeetingRecordingDto {
  @ApiPropertyOptional({ description: '会议ID' })
  @IsOptional()
  @IsString()
  meetingId?: string;

  @ApiPropertyOptional({ description: '录音来源', enum: RecordingSource })
  @IsOptional()
  @IsEnum(RecordingSource)
  source?: RecordingSource;

  @ApiPropertyOptional({ description: '状态', enum: RecordingStatus })
  @IsOptional()
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

export class CreateMeetingRecordingDto {
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
}

export class UpdateMeetingRecordingDto extends PartialType(CreateMeetingRecordingDto) {}

export class MeetingRecordingListResponseDto {
  @ApiProperty({ description: '列表数据', type: [Object] })
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
