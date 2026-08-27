import { Type } from 'class-transformer';
import { IsDateString, IsInt, Matches, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MeetingPlatform, MeetingType, RecordingSource } from '@prisma/client';

const TIMEZONE_SUFFIX = /(?:Z|[+-]\d{2}:\d{2})$/;

export class QueryPlatformUserMeetingTranscriptsDto {
  @ApiProperty({
    description: '查询开始时间（包含时区的 ISO 8601 时间，包含边界）',
    example: '2026-08-01T00:00:00+08:00',
  })
  @IsDateString({}, { message: 'startDate 必须是有效的 ISO 8601 时间' })
  @Matches(TIMEZONE_SUFFIX, { message: 'startDate 必须包含时区信息' })
  startDate: string;

  @ApiProperty({
    description: '查询结束时间（包含时区的 ISO 8601 时间，不包含边界）',
    example: '2026-09-01T00:00:00+08:00',
  })
  @IsDateString({}, { message: 'endDate 必须是有效的 ISO 8601 时间' })
  @Matches(TIMEZONE_SUFFIX, { message: 'endDate 必须包含时区信息' })
  endDate: string;
}

export class QueryPlatformUserTranscriptContextDto {
  @ApiProperty({
    description: '每个目标发言前后分别包含的转写段落数',
    minimum: 0,
    maximum: 20,
    example: 3,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  depth: number;
}

export class PlatformUserTranscriptIdentityDto {
  @ApiProperty({ description: '平台用户记录 ID' })
  id: string;

  @ApiProperty({
    description: '平台用户显示名称',
    type: String,
    nullable: true,
  })
  displayName: string | null;
}

export class PlatformUserTranscriptSegmentDto {
  @ApiProperty({ description: '转写段落 ID' })
  id: string;

  @ApiProperty({ description: '说话人名称' })
  speakerName: string;

  @ApiProperty({ description: '开始时间，格式为 hh:mm:ss' })
  startTime: string;

  @ApiProperty({ description: '结束时间，格式为 hh:mm:ss' })
  endTime: string;

  @ApiProperty({ description: '转写文本' })
  text: string;

  @ApiProperty({
    description: '说话人关联的平台用户；未关联时为 null',
    type: 'object',
    nullable: true,
    properties: {
      id: {
        type: 'string',
        description: '平台用户记录 ID',
      },
      displayName: {
        type: 'string',
        description: '平台用户显示名称',
        nullable: true,
      },
    },
  })
  platformUser: PlatformUserTranscriptIdentityDto | null;
}

export class PlatformUserTranscriptContextSegmentDto extends PlatformUserTranscriptSegmentDto {
  @ApiProperty({ description: '该段是否为目标平台用户的发言' })
  isTargetSpeaker: boolean;
}

export class PlatformUserTranscriptGroupDto {
  @ApiProperty({ description: '转写记录 ID' })
  transcriptId: string;

  @ApiProperty({ type: [PlatformUserTranscriptSegmentDto] })
  segments: PlatformUserTranscriptSegmentDto[];
}

export class PlatformUserTranscriptContextGroupDto {
  @ApiProperty({ description: '转写记录 ID' })
  transcriptId: string;

  @ApiProperty({ type: [PlatformUserTranscriptContextSegmentDto] })
  segments: PlatformUserTranscriptContextSegmentDto[];
}

export class PlatformUserTranscriptMinuteDto {
  @ApiProperty({ description: 'Minute ID' })
  minuteId: string;

  @ApiProperty({
    description: '外部系统录制 ID',
    type: String,
    nullable: true,
  })
  externalId: string | null;

  @ApiProperty({ description: '录制来源', enum: RecordingSource })
  source: RecordingSource;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  startAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  endAt: Date | null;

  @ApiProperty({ type: [PlatformUserTranscriptGroupDto] })
  transcripts: PlatformUserTranscriptGroupDto[];
}

export class PlatformUserTranscriptMeetingDto {
  @ApiProperty({ description: '会议 ID' })
  meetingId: string;

  @ApiProperty({ description: '会议标题' })
  title: string;

  @ApiProperty({ description: '会议平台', enum: MeetingPlatform })
  platform: MeetingPlatform;

  @ApiProperty({ description: '会议类型', enum: MeetingType })
  type: MeetingType;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  startAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  endAt: Date | null;

  @ApiProperty({ type: [PlatformUserTranscriptMinuteDto] })
  minutes: PlatformUserTranscriptMinuteDto[];
}

export class PlatformUserMeetingTranscriptsResponseDto {
  @ApiProperty({ type: PlatformUserTranscriptIdentityDto })
  platformUser: PlatformUserTranscriptIdentityDto;

  @ApiProperty({ type: String, format: 'date-time' })
  startDate: string;

  @ApiProperty({ type: String, format: 'date-time' })
  endDate: string;

  @ApiProperty({ type: [PlatformUserTranscriptMeetingDto] })
  meetings: PlatformUserTranscriptMeetingDto[];
}

export class PlatformUserTranscriptContextResponseDto {
  @ApiProperty({ type: PlatformUserTranscriptIdentityDto })
  platformUser: PlatformUserTranscriptIdentityDto;

  @ApiProperty({ description: 'Minute ID' })
  minuteId: string;

  @ApiProperty({ minimum: 0, maximum: 20 })
  depth: number;

  @ApiProperty({ type: [PlatformUserTranscriptContextGroupDto] })
  transcripts: PlatformUserTranscriptContextGroupDto[];
}
