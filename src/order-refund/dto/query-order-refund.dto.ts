import { ApiPropertyOptional } from '@nestjs/swagger';
import { RefundChannel, RefundStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryOrderRefundDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ description: '售后编号、订单号、申请人或原因关键词' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '退款状态', enum: RefundStatus })
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @ApiPropertyOptional({ description: '退款渠道', enum: RefundChannel })
  @IsOptional()
  @IsEnum(RefundChannel)
  refundChannel?: RefundChannel;

  @ApiPropertyOptional({ description: '订单 ID' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: '提交开始时间' })
  @IsOptional()
  @IsDateString()
  submittedFrom?: string;

  @ApiPropertyOptional({ description: '提交结束时间' })
  @IsOptional()
  @IsDateString()
  submittedTo?: string;

  @ApiPropertyOptional({ description: '是否包含已删除记录', default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({ description: '排序字段', example: 'submittedAt' })
  @IsOptional()
  @IsString()
  sortField?: string;

  @ApiPropertyOptional({ description: '排序方向', example: 'descend' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ascend' | 'descend' | 'asc' | 'desc';
}
