import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SyncRecordingsDto {
  @ApiPropertyOptional({
    description: '查询起始时间戳（Unix 秒），默认为7天前',
    example: 1611072000,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  startTime?: number;

  @ApiPropertyOptional({
    description: '查询结束时间戳（Unix 秒），默认为当前时间',
    example: 1613750400,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  endTime?: number;

  @ApiPropertyOptional({
    description: '操作者ID，默认为配置文件中的 userId',
    example: 'user_123',
  })
  @IsOptional()
  @IsString()
  operatorId?: string;
}
