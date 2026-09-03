import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';

import { PayslipItemCategory } from '../types';
export { PayslipItemCategory };

export class CreatePayslipAdjustmentDto {
  @ApiProperty({ description: '员工 ID' })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiProperty({ description: '归属业务月份，格式 YYYY-MM（如 2026-09）' })
  @IsString()
  @IsNotEmpty()
  month: string;

  @ApiProperty({
    description: '款项类别',
    enum: PayslipItemCategory,
    example: PayslipItemCategory.BONUS,
  })
  @IsEnum(PayslipItemCategory)
  category: PayslipItemCategory;

  @ApiProperty({ description: '款项名称（如：9月销冠奖、餐费补贴、事假扣款）' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '金额（分，正整数）', example: 50000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ description: '备注说明' })
  @IsString()
  @IsOptional()
  remark?: string;
}
