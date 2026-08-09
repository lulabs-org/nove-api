import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  recordingId: string;

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
