import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentProvider } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class WechatOrderWebhookDto {
  @ApiProperty({ description: '外部平台订单号' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiPropertyOptional({ enum: OrderStatus, description: '内部订单状态' })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: '外部平台订单创建时间，ISO 8601 格式，仅用于 metadata 记录',
  })
  @IsOptional()
  @IsDateString()
  externalCreatedAt?: string;

  @ApiPropertyOptional({
    description: '外部平台订单更新时间，ISO 8601 格式，仅用于 metadata 记录',
  })
  @IsOptional()
  @IsDateString()
  externalUpdatedAt?: string;

  @ApiPropertyOptional({ description: '支付时间，ISO 8601 格式' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ description: '订单金额，单位分' })
  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ enum: PaymentProvider, description: '支付提供商' })
  @IsOptional()
  @IsEnum(PaymentProvider)
  paymentProvider?: PaymentProvider;

  @ApiPropertyOptional({ description: '支付平台流水号/交易号' })
  @IsOptional()
  @IsString()
  providerTradeNo?: string;

  @ApiPropertyOptional({ description: '产品 ID' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ description: '产品名称快照' })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({ description: '订单手机号' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: '原始平台响应或扩展信息' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
