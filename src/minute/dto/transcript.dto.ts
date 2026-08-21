import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';

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

export class TranscriptParagraphDto {
  @ApiPropertyOptional({ description: '说话人名称' })
  speakerName?: string;

  @ApiPropertyOptional({ description: '开始时间, 格式 hh:mm:ss' })
  startTime?: string;

  @ApiPropertyOptional({ description: '结束时间, 格式 hh:mm:ss' })
  endTime?: string;

  @ApiPropertyOptional({ description: '文本内容' })
  text?: string;
}

export class TranscriptByRecordingIdResponseDto {
  @ApiPropertyOptional({ description: '拼接后的转写文本 (format=text 时返回)' })
  text?: string;

  @ApiPropertyOptional({
    type: [TranscriptParagraphDto],
    description: '转写段落 JSON 数组 (format=json 时返回)',
  })
  data?: TranscriptParagraphDto[];
}
