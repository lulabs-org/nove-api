import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

function normalizeScalarToString(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  return String(value);
}

class WechatPayInfoDto {
  @ApiPropertyOptional({ description: '支付流水号', example: '4200001234202603261234567890' })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  transaction_id?: string;

  @ApiPropertyOptional({ description: '支付方式', example: 'WECHAT_PAY' })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  payment_method?: string;

  @ApiPropertyOptional({
    description: '支付时间，支持 ISO 字符串、秒级或毫秒级时间戳',
    example: '2026-03-26T10:30:00+08:00',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  pay_time?: string;
}

class WechatAddressInfoDto {
  @ApiPropertyOptional({ description: '收货手机号', example: '13800138000' })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  tel_number?: string;

  @ApiPropertyOptional({ description: '收件人使用手机号', example: '13800138000' })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  use_tel_number?: string;
}

class WechatDeliveryInfoDto {
  @ApiPropertyOptional({ type: () => WechatAddressInfoDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WechatAddressInfoDto)
  address_info?: WechatAddressInfoDto;
}

class WechatProductInfoDto {
  @ApiPropertyOptional({ description: '商品 ID', example: 'prod_10001' })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  product_id?: string;

  @ApiPropertyOptional({ description: '商品标题', example: '微信小店体验课' })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  title?: string;
}

export class WechatOrderWebhookDto {
  @ApiProperty({ description: '外部平台订单号', example: 'wx_order_202603260001' })
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  @IsNotEmpty()
  order_id!: string;

  @ApiPropertyOptional({ description: '外部订单状态', example: 'PAID' })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: '创建时间，支持 ISO 字符串、秒级或毫秒级时间戳',
    example: '2026-03-26T10:00:00+08:00',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  create_time?: string;

  @ApiPropertyOptional({
    description: '更新时间，支持 ISO 字符串、秒级或毫秒级时间戳',
    example: '2026-03-26T10:30:00+08:00',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  update_time?: string;

  @ApiPropertyOptional({ type: () => WechatPayInfoDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WechatPayInfoDto)
  pay_info?: WechatPayInfoDto;

  @ApiPropertyOptional({ type: () => WechatDeliveryInfoDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WechatDeliveryInfoDto)
  delivery_info?: WechatDeliveryInfoDto;

  @ApiPropertyOptional({ type: () => [WechatProductInfoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WechatProductInfoDto)
  product_infos?: WechatProductInfoDto[];
}
