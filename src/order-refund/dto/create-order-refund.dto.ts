import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RefundChannel } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateOrderRefundDto {
  @ApiProperty({ description: '售后编号', example: 'AS202608130001' })
  @IsString()
  afterSaleCode: string;

  @ApiPropertyOptional({ description: '所属订单 ID' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: '退款渠道', enum: RefundChannel })
  @IsOptional()
  @IsEnum(RefundChannel)
  refundChannel?: RefundChannel;

  @ApiPropertyOptional({ description: '审批链接' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  approvalUrl?: string;

  @ApiPropertyOptional({ description: '退款金额，最小单位为分' })
  @IsOptional()
  @IsInt()
  @Min(0)
  refundAmount?: number;

  @ApiPropertyOptional({ description: '退款原因' })
  @IsOptional()
  @IsString()
  refundReason?: string;

  @ApiPropertyOptional({ description: '权益实际使用天数' })
  @IsOptional()
  @IsInt()
  @Min(0)
  benefitUsedDays?: number;

  @ApiPropertyOptional({ description: '申请人姓名' })
  @IsOptional()
  @IsString()
  applicantName?: string;

  @ApiPropertyOptional({ description: '财务备注' })
  @IsOptional()
  @IsString()
  financialNote?: string;

  @ApiPropertyOptional({ description: '父退款记录 ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: '产品类别' })
  @IsOptional()
  @IsString()
  productCategory?: string;

  @ApiPropertyOptional({ description: '提交时间' })
  @IsOptional()
  @IsDateString()
  submittedAt?: string;
}
