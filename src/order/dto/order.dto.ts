import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, OrderStatus, PaymentProvider, Prisma } from '@prisma/client';

export class OrderRelationDto {
  @ApiProperty({ description: '关联对象 ID' })
  id: string | number;

  @ApiPropertyOptional({ description: '关联对象编码', nullable: true })
  code?: string | null;

  @ApiPropertyOptional({ description: '关联对象名称', nullable: true })
  name?: string | null;

  @ApiPropertyOptional({ description: '关联邮箱', nullable: true })
  email?: string | null;
}

export class OrderDto {
  @ApiProperty({ description: '订单 ID' })
  id: string;

  @ApiProperty({ description: '内部订单号' })
  orderCode: string;

  @ApiProperty({ description: '对外展示订单号' })
  orderNumber: string;

  @ApiPropertyOptional({ description: '外部平台订单号', nullable: true })
  externalId: string | null;

  @ApiPropertyOptional({ description: '扩展元数据', nullable: true })
  metadata: Prisma.JsonValue | null;

  @ApiPropertyOptional({ description: '产品 ID', nullable: true })
  productId: string | null;

  @ApiPropertyOptional({ description: '产品名称快照', nullable: true })
  productName: string | null;

  @ApiPropertyOptional({ description: '购买者用户 ID', nullable: true })
  purchaserId: string | null;

  @ApiPropertyOptional({ description: '渠道 ID', nullable: true })
  channelId: number | null;

  @ApiPropertyOptional({ description: '客户邮箱', nullable: true })
  email: string | null;

  @ApiPropertyOptional({ description: '客户手机号', nullable: true })
  phone: string | null;

  @ApiPropertyOptional({ description: '手机号区号', nullable: true })
  phoneCode: string | null;

  @ApiPropertyOptional({ description: '当前负责人用户 ID', nullable: true })
  currentOwnerId: string | null;

  @ApiPropertyOptional({ description: '财务结单人用户 ID', nullable: true })
  financialCloserId: string | null;

  @ApiPropertyOptional({ description: '财务结单时间', nullable: true })
  financialClosedAt: Date | null;

  @ApiProperty({ description: '订单金额，最小货币单位' })
  amount: number;

  @ApiProperty({ description: '币种', enum: Currency })
  currency: Currency;

  @ApiPropertyOptional({
    description: '人民币金额，最小单位分',
    nullable: true,
  })
  amountCny: number | null;

  @ApiPropertyOptional({ description: '兑人民币汇率', nullable: true })
  fxRateToCny: string | null;

  @ApiPropertyOptional({ description: '锁汇时间', nullable: true })
  fxLockedAt: Date | null;

  @ApiProperty({ description: '订单状态', enum: OrderStatus })
  status: OrderStatus;

  @ApiPropertyOptional({ description: '支付时间', nullable: true })
  paidAt: Date | null;

  @ApiPropertyOptional({ description: '取消时间', nullable: true })
  cancelledAt: Date | null;

  @ApiPropertyOptional({ description: '退款时间', nullable: true })
  refundedAt: Date | null;

  @ApiPropertyOptional({ description: '完成时间', nullable: true })
  completedAt: Date | null;

  @ApiPropertyOptional({ description: '生效时间', nullable: true })
  effectiveAt: Date | null;

  @ApiPropertyOptional({ description: '权益开始时间', nullable: true })
  benefitStart: Date | null;

  @ApiPropertyOptional({ description: '权益结束时间', nullable: true })
  benefitEnd: Date | null;

  @ApiPropertyOptional({
    description: '支付提供方',
    enum: PaymentProvider,
    nullable: true,
  })
  paymentProvider: PaymentProvider | null;

  @ApiPropertyOptional({ description: '支付平台流水号', nullable: true })
  providerTradeNo: string | null;

  @ApiPropertyOptional({
    description: '产品信息',
    type: OrderRelationDto,
    nullable: true,
  })
  product: OrderRelationDto | null;

  @ApiPropertyOptional({
    description: '购买者信息',
    type: OrderRelationDto,
    nullable: true,
  })
  purchaser: OrderRelationDto | null;

  @ApiPropertyOptional({
    description: '渠道信息',
    type: OrderRelationDto,
    nullable: true,
  })
  channel: OrderRelationDto | null;

  @ApiPropertyOptional({
    description: '负责人信息',
    type: OrderRelationDto,
    nullable: true,
  })
  currentOwner: OrderRelationDto | null;

  @ApiPropertyOptional({
    description: '财务结单人信息',
    type: OrderRelationDto,
    nullable: true,
  })
  financialCloser: OrderRelationDto | null;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: '删除时间', nullable: true })
  deletedAt: Date | null;
}

export class OrderListResponse {
  @ApiProperty({ description: '订单列表', type: [OrderDto] })
  items: OrderDto[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  pageSize: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}
