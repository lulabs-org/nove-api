import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

export enum WechatSyncPeriod {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

export enum WechatSyncKind {
  ORDERS = 'orders',
  AFTERSALE = 'aftersale',
}

export class WechatShopSyncScheduleDto {
  @ApiProperty({ enum: WechatSyncKind, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(WechatSyncKind, { each: true })
  kinds!: WechatSyncKind[];

  @ApiProperty({ enum: WechatSyncPeriod })
  @IsEnum(WechatSyncPeriod)
  period!: WechatSyncPeriod;

  @ApiPropertyOptional({ enum: [1, 6, 12], description: '按小时同步的间隔' })
  @IsOptional()
  @IsIn([1, 6, 12])
  intervalHours?: number;

  @ApiPropertyOptional({
    example: '09:30',
    description: '北京时间，日/周同步必填',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  time?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 6, description: '周日为 0' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weekday?: number;
}
