import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class StripeRefundHistorySyncDto {
  @ApiPropertyOptional({
    description:
      '退款同步起始时间（支持 ISO 8601 字符串，如 2026-09-01T00:00:00.000Z）',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description:
      '退款同步截止时间（支持 ISO 8601 字符串，如 2026-09-12T00:00:00.000Z）',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: '单批次拉取数量（默认 100，最大 100）',
    default: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
