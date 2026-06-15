import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, OrderStatus, PaymentProvider } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateOrderDto {
  @ApiPropertyOptional({
    description: '内部订单号，不传则由系统生成',
    example: 'ORD202606150001',
  })
  @IsOptional()
  @IsString()
  orderCode?: string;

  @ApiPropertyOptional({
    description: '对外展示订单号，不传则由系统生成',
    example: '202606151030001',
  })
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @ApiPropertyOptional({
    description: '外部平台订单号',
    example: 'WX_20260615_001',
  })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({
    description: '扩展元数据',
    example: { source: 'manual' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: '产品 ID',
    example: 'clx1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    description: '产品名称快照',
    example: 'NOVE 年度会员',
  })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({
    description: '购买者用户 ID',
    example: 'clx1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  purchaserId?: string;

  @ApiPropertyOptional({
    description: '渠道 ID',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  channelId?: number;

  @ApiPropertyOptional({
    description: '客户邮箱',
    example: 'customer@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: '客户手机号',
    example: '13800138000',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: '手机号区号',
    example: '+86',
  })
  @IsOptional()
  @IsString()
  phoneCode?: string;

  @ApiPropertyOptional({
    description: '当前负责人用户 ID',
    example: 'clx1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  currentOwnerId?: string;

  @ApiPropertyOptional({
    description: '财务结单人用户 ID',
    example: 'clx1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  financialCloserId?: string;

  @ApiPropertyOptional({
    description: '财务结单时间',
    example: '2026-06-15T10:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  financialClosedAt?: string;

  @ApiProperty({
    description: '订单金额，最小货币单位',
    example: 29900,
  })
  @IsInt()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    description: '币种',
    enum: Currency,
    default: Currency.CNY,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({
    description: '人民币金额，最小单位分',
    example: 29900,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  amountCny?: number;

  @ApiPropertyOptional({
    description: '兑人民币汇率',
    example: '7.20000000',
  })
  @IsOptional()
  @IsString()
  fxRateToCny?: string;

  @ApiPropertyOptional({
    description: '锁汇时间',
    example: '2026-06-15T10:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  fxLockedAt?: string;

  @ApiPropertyOptional({
    description: '订单状态',
    enum: OrderStatus,
    default: OrderStatus.UNPAID,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: '支付时间' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ description: '取消时间' })
  @IsOptional()
  @IsDateString()
  cancelledAt?: string;

  @ApiPropertyOptional({ description: '退款时间' })
  @IsOptional()
  @IsDateString()
  refundedAt?: string;

  @ApiPropertyOptional({ description: '完成时间' })
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiPropertyOptional({ description: '生效时间' })
  @IsOptional()
  @IsDateString()
  effectiveAt?: string;

  @ApiPropertyOptional({ description: '权益开始时间' })
  @IsOptional()
  @IsDateString()
  benefitStart?: string;

  @ApiPropertyOptional({ description: '权益结束时间' })
  @IsOptional()
  @IsDateString()
  benefitEnd?: string;

  @ApiPropertyOptional({
    description: '支付提供方',
    enum: PaymentProvider,
  })
  @IsOptional()
  @IsEnum(PaymentProvider)
  paymentProvider?: PaymentProvider;

  @ApiPropertyOptional({
    description: '支付平台流水号',
    example: '4200000000000000000',
  })
  @IsOptional()
  @IsString()
  providerTradeNo?: string;
}
