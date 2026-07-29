import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsOptional, ValidateNested } from 'class-validator';

export class WechatOrderTimeRangeDto {
  @ApiProperty({ description: '开始时间，ISO 8601 格式' })
  @IsDateString()
  start_time!: string;

  @ApiProperty({ description: '结束时间，ISO 8601 格式' })
  @IsDateString()
  end_time!: string;
}

export class WechatOrderHistorySyncDto {
  @ApiPropertyOptional({
    description: '订单创建时间范围，时间范围至少填一个',
    type: WechatOrderTimeRangeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WechatOrderTimeRangeDto)
  create_time_range?: WechatOrderTimeRangeDto;

  @ApiPropertyOptional({
    description: '订单更新时间范围，时间范围至少填一个',
    type: WechatOrderTimeRangeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WechatOrderTimeRangeDto)
  update_time_range?: WechatOrderTimeRangeDto;
}
