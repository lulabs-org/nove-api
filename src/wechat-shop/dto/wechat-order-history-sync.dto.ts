import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, ValidateNested } from 'class-validator';
import { IsMutuallyExclusive } from '@/common/decorators/is-mutually-exclusive.decorator';

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
    description: '订单创建时间范围，必须且只能填写一个时间范围',
    type: WechatOrderTimeRangeDto,
  })
  @IsMutuallyExclusive('update_time_range')
  @ValidateNested()
  @Type(() => WechatOrderTimeRangeDto)
  create_time_range?: WechatOrderTimeRangeDto;

  @ApiPropertyOptional({
    description: '订单更新时间范围，必须且只能填写一个时间范围',
    type: WechatOrderTimeRangeDto,
  })
  @IsMutuallyExclusive('create_time_range')
  @ValidateNested()
  @Type(() => WechatOrderTimeRangeDto)
  update_time_range?: WechatOrderTimeRangeDto;
}
