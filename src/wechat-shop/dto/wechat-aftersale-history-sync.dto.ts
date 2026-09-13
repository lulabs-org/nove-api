import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsMutuallyExclusive } from '@/common/decorators/is-mutually-exclusive.decorator';
import { WechatOrderTimeRangeDto } from './wechat-order-history-sync.dto';

export class WechatAftersaleHistorySyncDto {
  @ApiPropertyOptional({
    description: '售后单创建时间范围，必须且只能填写一个时间范围',
    type: WechatOrderTimeRangeDto,
  })
  @IsMutuallyExclusive('update_time_range')
  @ValidateNested()
  @Type(() => WechatOrderTimeRangeDto)
  create_time_range?: WechatOrderTimeRangeDto;

  @ApiPropertyOptional({
    description: '售后单更新时间范围，必须且只能填写一个时间范围',
    type: WechatOrderTimeRangeDto,
  })
  @IsMutuallyExclusive('create_time_range')
  @ValidateNested()
  @Type(() => WechatOrderTimeRangeDto)
  update_time_range?: WechatOrderTimeRangeDto;
}

export class WechatAftersaleListQueryDto {
  @ApiPropertyOptional({ description: '售后单创建起始时间戳（秒级）' })
  @IsOptional()
  @IsInt()
  @Min(0)
  begin_create_time?: number;

  @ApiPropertyOptional({
    description: '售后单创建结束时间戳（秒级），差值不超过 24 小时 (86400秒)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  end_create_time?: number;

  @ApiPropertyOptional({ description: '售后单更新起始时间戳（秒级）' })
  @IsOptional()
  @IsInt()
  @Min(0)
  begin_update_time?: number;

  @ApiPropertyOptional({
    description: '售后单更新结束时间戳（秒级），差值不超过 24 小时 (86400秒)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  end_update_time?: number;

  @ApiPropertyOptional({ description: '翻页游标，由上一页返回' })
  @IsOptional()
  @IsString()
  next_key?: string;

  @ApiPropertyOptional({
    description: '售后单创建时间范围（ISO 8601），若不传秒级时间戳可传此字段',
    type: WechatOrderTimeRangeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WechatOrderTimeRangeDto)
  create_time_range?: WechatOrderTimeRangeDto;

  @ApiPropertyOptional({
    description: '售后单更新时间范围（ISO 8601），若不传秒级时间戳可传此字段',
    type: WechatOrderTimeRangeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WechatOrderTimeRangeDto)
  update_time_range?: WechatOrderTimeRangeDto;
}
