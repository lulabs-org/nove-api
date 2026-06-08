import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class WechatOrderHistorySyncDto {
  @ApiProperty({ description: '同步开始时间，ISO 8601 格式' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ description: '同步结束时间，ISO 8601 格式' })
  @IsDateString()
  endTime!: string;

  @ApiPropertyOptional({
    enum: ['create', 'update'],
    default: 'create',
    description: '按订单创建时间或更新时间拉取',
  })
  @IsOptional()
  @IsIn(['create', 'update'])
  timeType?: 'create' | 'update';

  @ApiPropertyOptional({
    description: '微信小店订单状态，不传则同步全部状态',
    minimum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  status?: number;

  @ApiPropertyOptional({
    description: '每页数量，微信小店限制不超过 100',
    default: 100,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({
    description: '仅拉取并解析，不写入数据库',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
