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

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  return value;
}

class WechatPayInfoDto {
  @ApiPropertyOptional({
    description: '支付流水号',
    example: '4200001234202603261234567890',
  })
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
    description: '预支付时间，支持 ISO 字符串、秒级或毫秒级时间戳',
    example: '2026-03-26T10:03:00+08:00',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  prepay_time?: string;

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
  @ApiPropertyOptional({ description: '收件人姓名', example: '陈先生' })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  user_name?: string;

  @ApiPropertyOptional({ description: '省份', example: '广东' })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  province_name?: string;

  @ApiPropertyOptional({ description: '城市', example: '广州' })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  city_name?: string;

  @ApiPropertyOptional({ description: '收货手机号', example: '13800138000' })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  tel_number?: string;

  @ApiPropertyOptional({
    description: '收件人使用手机号',
    example: '13800138000',
  })
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

  @ApiPropertyOptional({ description: '商品 SKU ID', example: 'sku_10001' })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  sku_id?: string;

  @ApiPropertyOptional({ description: '商品标题', example: '微信小店体验课' })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  title?: string;
}

class WechatPriceInfoDto {
  @ApiPropertyOptional({ description: '商品总价，单位分', example: 20000 })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  product_price?: string;

  @ApiPropertyOptional({ description: '订单应付金额，单位分', example: 10500 })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  order_price?: string;

  @ApiPropertyOptional({ description: '运费，单位分', example: 500 })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  freight?: string;

  @ApiPropertyOptional({ description: '优惠金额，单位分', example: 10000 })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  discounted_price?: string;
}

class WechatOrderDetailDto {
  @ApiPropertyOptional({ type: () => [WechatProductInfoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WechatProductInfoDto)
  product_infos?: WechatProductInfoDto[];

  @ApiPropertyOptional({ type: () => WechatPayInfoDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WechatPayInfoDto)
  pay_info?: WechatPayInfoDto;

  @ApiPropertyOptional({ type: () => WechatPriceInfoDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WechatPriceInfoDto)
  price_info?: WechatPriceInfoDto;

  @ApiPropertyOptional({ type: () => WechatDeliveryInfoDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WechatDeliveryInfoDto)
  delivery_info?: WechatDeliveryInfoDto;
}

export class WechatOrderWebhookDto {
  @ApiProperty({
    description: '外部平台订单号',
    example: 'wx_order_202603260001',
  })
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

  @ApiPropertyOptional({ type: () => WechatPriceInfoDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WechatPriceInfoDto)
  price_info?: WechatPriceInfoDto;

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

  @ApiPropertyOptional({ description: '订单归属人 openid', example: 'OPENID' })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  openid?: string;

  @ApiPropertyOptional({
    description: '订单归属人 unionid',
    example: 'UNIONID',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeScalarToString(value))
  @IsString()
  unionid?: string;

  @ApiPropertyOptional({ type: () => WechatOrderDetailDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WechatOrderDetailDto)
  order_detail?: WechatOrderDetailDto;
}
