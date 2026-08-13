import { ApiPropertyOptional } from '@nestjs/swagger';
import { RefundStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateRefundStatusDto {
  @ApiPropertyOptional({
    description: '退款状态',
    enum: RefundStatus,
    default: RefundStatus.SETTLED,
  })
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @ApiPropertyOptional({ description: '实际退款时间' })
  @IsOptional()
  @IsDateString()
  refundedAt?: string;

  @ApiPropertyOptional({ description: '财务结算时间' })
  @IsOptional()
  @IsDateString()
  financialSettledAt?: string;

  @ApiPropertyOptional({ description: '财务备注' })
  @IsOptional()
  @IsString()
  financialNote?: string;
}
