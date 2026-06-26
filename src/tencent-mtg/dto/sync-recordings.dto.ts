import { IsOptional, IsString, IsDate, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SyncRecordingsDto {
  @ApiPropertyOptional({
    description:
      '开始日期（务必传入包含时区信息的 ISO 8601 格式，例如前端通过 date.toISOString() 生成）',
    example: '2023-12-31T16:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({
    description:
      '结束日期（务必传入包含时区信息的 ISO 8601 格式，例如前端通过 date.toISOString() 生成）',
    example: '2024-12-31T15:59:59.999Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({
    description: '操作者ID，默认为配置文件中的 userId',
    example: 'user_123',
  })
  @IsOptional()
  @IsString()
  operatorId?: string;

  @ApiPropertyOptional({
    description: '是否同步会议的转写记录，默认为 true',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  syncTranscripts?: boolean;
}
