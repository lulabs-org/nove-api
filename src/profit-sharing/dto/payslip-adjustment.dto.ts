import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';

export enum PayslipItemCategory {
  BASE_SALARY = 'BASE_SALARY', // 基本底薪 / 固定课酬
  COMMISSION = 'COMMISSION', // 订单提成 / 销售分润
  BONUS = 'BONUS', // 各类奖金（绩效、销冠、全勤等）
  SUBSIDY = 'SUBSIDY', // 津贴与补贴（餐补、车补、话费等）
  DEDUCTION = 'DEDUCTION', // 扣减项（考勤迟到、缺勤、代扣等）
}

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
