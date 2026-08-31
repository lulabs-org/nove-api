import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecordingFileType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AttachMinuteFileDto {
  @ApiProperty({ description: '云盘逻辑文件 ID' })
  @IsString()
  fileId: string;

  @ApiProperty({ enum: RecordingFileType })
  @IsEnum(RecordingFileType)
  fileType: RecordingFileType;

  @ApiPropertyOptional({ description: '时长，毫秒' })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolution?: string;
}
