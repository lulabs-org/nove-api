import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, RefundChannel, RefundStatus } from '@prisma/client';

export class RefundOrderRelationDto {
  @ApiProperty({ description: '订单 ID' })
  id: string;

  @ApiProperty({ description: '内部订单号' })
  orderCode: string;

  @ApiProperty({ description: '展示订单号' })
  orderNumber: string;

  @ApiPropertyOptional({ description: '产品名称', nullable: true })
  productName: string | null;

  @ApiProperty({ description: '订单金额，最小货币单位' })
  amount: number;

  @ApiProperty({ description: '币种', enum: Currency })
  currency: Currency;

  @ApiPropertyOptional({ description: '客户邮箱', nullable: true })
  email: string | null;

  @ApiPropertyOptional({ description: '客户手机号', nullable: true })
  phone: string | null;
}

export class RefundCreatorDto {
  @ApiProperty({ description: '用户 ID' })
  id: string;

  @ApiPropertyOptional({ description: '用户名', nullable: true })
  username: string | null;

  @ApiPropertyOptional({ description: '邮箱', nullable: true })
  email: string | null;

  @ApiPropertyOptional({ description: '显示名称', nullable: true })
  displayName: string | null;
}

export class OrderRefundDto {
  @ApiProperty() id: string;
  @ApiProperty() afterSaleCode: string;
  @ApiPropertyOptional({ nullable: true }) orderId: string | null;
  @ApiPropertyOptional({ enum: RefundChannel, nullable: true })
  refundChannel: RefundChannel | null;
  @ApiPropertyOptional({ nullable: true }) approvalUrl: string | null;
  @ApiPropertyOptional({ nullable: true }) createdBy: string | null;
  @ApiPropertyOptional({ nullable: true }) refundAmount: number | null;
  @ApiPropertyOptional({ nullable: true }) refundReason: string | null;
  @ApiPropertyOptional({ nullable: true }) benefitUsedDays: number | null;
  @ApiPropertyOptional({ nullable: true }) applicantName: string | null;
  @ApiProperty({ enum: RefundStatus }) status: RefundStatus;
  @ApiPropertyOptional({ nullable: true }) financialNote: string | null;
  @ApiPropertyOptional({ nullable: true }) parentId: string | null;
  @ApiPropertyOptional({ nullable: true }) productCategory: string | null;
  @ApiPropertyOptional({ nullable: true }) submittedAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) refundedAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) financialSettledAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional({ nullable: true }) deletedAt: Date | null;
  @ApiPropertyOptional({ type: RefundOrderRelationDto, nullable: true })
  order: RefundOrderRelationDto | null;
  @ApiPropertyOptional({ type: RefundCreatorDto, nullable: true })
  creator: RefundCreatorDto | null;
}

export class OrderRefundListResponse {
  @ApiProperty({ type: [OrderRefundDto] }) items: OrderRefundDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() totalPages: number;
}
