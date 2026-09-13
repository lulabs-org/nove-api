import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryTranscriptDto {
  @ApiPropertyOptional({
    description: '是否同时返回转写说话人关联的本地用户资料',
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    const rawValue: unknown = value;
    if (rawValue === true || rawValue === 'true') return true;
    if (rawValue === false || rawValue === 'false') return false;
    return rawValue;
  })
  @IsBoolean()
  includeLocalUser?: boolean = false;
}

export class CreateTranscriptDto {
  @ApiProperty({ description: '转写来源/文件名' })
  @IsString()
  @IsNotEmpty()
  source: string;

  @ApiProperty({ description: '关联的会议录制ID' })
  @IsString()
  @IsNotEmpty()
  minuteId: string;

  @ApiPropertyOptional({ description: '原始文件的存储链接' })
  @IsString()
  @IsOptional()
  rawFileUrl?: string;

  @ApiPropertyOptional({ description: '转写状态', default: 0 })
  @IsNumber()
  @IsOptional()
  status?: number;

  @ApiPropertyOptional({ description: '开始时间' })
  @IsDateString()
  @IsOptional()
  startedAt?: Date;

  @ApiPropertyOptional({ description: '结束时间' })
  @IsDateString()
  @IsOptional()
  finishedAt?: Date;
}

export class CreateTranscriptBodyDto extends OmitType(CreateTranscriptDto, [
  'minuteId',
] as const) {}

export class TranscriptDto {
  @ApiProperty({ description: '记录ID' })
  id: string;

  @ApiPropertyOptional({ description: '转写来源/文件名' })
  source?: string;

  @ApiPropertyOptional({ description: '关联的会议录制ID' })
  minuteId?: string;

  @ApiPropertyOptional({ description: '原始文件的存储链接' })
  rawFileUrl?: string;

  @ApiProperty({ description: '语言' })
  language: string;

  @ApiProperty({ description: '转写状态' })
  status: number;

  @ApiPropertyOptional({ description: '开始时间' })
  startedAt?: Date;

  @ApiPropertyOptional({ description: '结束时间' })
  finishedAt?: Date;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export class TranscriptListResponseDto {
  @ApiProperty({ type: [TranscriptDto], description: '转写记录列表' })
  data: TranscriptDto[];

  @ApiProperty({ description: '总条数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页条数' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}

export class TranscriptPlatformUserDto {
  @ApiProperty({ description: '平台用户记录 ID' })
  id: string;

  @ApiProperty({
    description: '平台用户显示名称',
    type: String,
    nullable: true,
  })
  displayName: string | null;
}

export class TranscriptLocalUserDto {
  @ApiProperty({ description: '本地用户 ID' })
  id: string;

  @ApiProperty({
    description: '本地用户资料显示名称',
    type: String,
    nullable: true,
  })
  displayName: string | null;

  @ApiProperty({
    description: '本地用户填写的完整姓名（未经实名认证）',
    type: String,
    nullable: true,
  })
  fullName: string | null;
}

export class TranscriptParagraphDto {
  @ApiProperty({ description: '转写段落 ID' })
  id: string;

  @ApiProperty({ description: '说话人名称' })
  speakerName: string;

  @ApiProperty({ description: '开始时间, 格式 hh:mm:ss' })
  startTime: string;

  @ApiProperty({ description: '结束时间, 格式 hh:mm:ss' })
  endTime: string;

  @ApiProperty({ description: '文本内容' })
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
  platformUser: TranscriptPlatformUserDto | null;

  @ApiProperty({
    description:
      '说话人关联的本地用户；includeLocalUser=false 或未关联时为 null',
    type: 'object',
    nullable: true,
    properties: {
      id: {
        type: 'string',
        description: '本地用户 ID',
      },
      displayName: {
        type: 'string',
        description: '本地用户资料显示名称',
        nullable: true,
      },
      fullName: {
        type: 'string',
        description: '本地用户填写的完整姓名（未经实名认证）',
        nullable: true,
      },
    },
  })
  user: TranscriptLocalUserDto | null;
}

export class TranscriptTextResponseDto {
  @ApiProperty({ description: '拼接后的转写文本' })
  text: string;
}

export class TranscriptJsonResponseDto {
  @ApiProperty({ description: '转写记录 ID' })
  transcriptId: string;

  @ApiProperty({
    type: [TranscriptParagraphDto],
    description: '转写段落 JSON 数组',
  })
  data: TranscriptParagraphDto[];
}
