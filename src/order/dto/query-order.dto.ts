import { ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, OrderStatus, PaymentProvider } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryOrderDto {
  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({
    description: '关键词，匹配订单号、外部订单号、商品名、邮箱、手机号或流水号',
    example: 'ORD2026',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '订单状态', enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: '币种', enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ description: '支付提供方', enum: PaymentProvider })
  @IsOptional()
  @IsEnum(PaymentProvider)
  paymentProvider?: PaymentProvider;

  @ApiPropertyOptional({ description: '渠道 ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  channelId?: number;

  @ApiPropertyOptional({ description: '产品 ID' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ description: '购买者用户 ID' })
  @IsOptional()
  @IsString()
  purchaserId?: string;

  @ApiPropertyOptional({ description: '负责人用户 ID' })
  @IsOptional()
  @IsString()
  currentOwnerId?: string;

  @ApiPropertyOptional({ description: '支付开始时间' })
  @IsOptional()
  @IsDateString()
  paidFrom?: string;

  @ApiPropertyOptional({ description: '支付结束时间' })
  @IsOptional()
  @IsDateString()
  paidTo?: string;

  @ApiPropertyOptional({ description: '创建开始时间' })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ description: '创建结束时间' })
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional({ description: '是否包含已删除订单', example: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({
    description: '排序字段',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortField?: string;

  @ApiPropertyOptional({
    description: '排序方向',
    example: 'descend',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ascend' | 'descend' | 'asc' | 'desc';
}
