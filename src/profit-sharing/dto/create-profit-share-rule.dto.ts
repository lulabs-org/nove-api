import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { ProfitShareRuleStatus, ProfitShareRuleType } from '@prisma/client';

export class CreateProfitShareAllocationDto {
  @ApiPropertyOptional({ description: '记录ID，供更新时使用' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({ description: '指定成员ID' })
  @IsString()
  @IsOptional()
  memberId?: string;

  @ApiPropertyOptional({ description: '指定角色ID' })
  @IsString()
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({
    description: '在当前模块内的分配比例，例如 0.5（按单比例模式使用）',
    example: 0.5,
  })
  @IsNumber()
  @IsOptional()
  allocationRatio?: number;

  @ApiPropertyOptional({
    description:
      '指定成员每月的固定分账金额（分），例如 500000 代表 5000 元（月度固定模式使用）',
    example: 500000,
  })
  @IsNumber()
  @IsOptional()
  fixedAmount?: number;
}

export class CreateProfitShareModuleDto {
  @ApiPropertyOptional({ description: '记录ID，供更新时使用' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ description: '模块名称，如：关单、运营对接、教师固定课酬' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: '该模块占总基数的比例，例如 0.04（按单比例模式使用）',
    example: 0.04,
  })
  @IsNumber()
  @IsOptional()
  shareRatio?: number;

  @ApiPropertyOptional({
    description:
      '该模块的固定金额（分），例如 500000 代表 5000 元（月度固定模式使用）',
    example: 500000,
  })
  @IsNumber()
  @IsOptional()
  fixedAmount?: number;

  @ApiPropertyOptional({
    description: '发生退款时是否需要按比例扣回',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isRefundable?: boolean;

  @ApiPropertyOptional({
    description:
      '结算模式，NONE: 不分摊, MONTHLY: 按月分摊, END_OF_TERM: 服务结束后结算',
    default: 'NONE',
    enum: ['NONE', 'MONTHLY', 'END_OF_TERM'],
  })
  @IsString()
  @IsOptional()
  @IsEnum(['NONE', 'MONTHLY', 'END_OF_TERM'])
  amortizationType?: 'NONE' | 'MONTHLY' | 'END_OF_TERM';

  @ApiPropertyOptional({
    description:
      '收益人分配模式: FIXED: 固定成员比例分配, ORDER_OWNER: 随订单当前负责人(currentOwnerId), FINANCIAL_CLOSER: 随订单财务关单人(financialCloserId)',
    default: 'FIXED',
    enum: ['FIXED', 'ORDER_OWNER', 'FINANCIAL_CLOSER'],
  })
  @IsString()
  @IsOptional()
  @IsEnum(['FIXED', 'ORDER_OWNER', 'FINANCIAL_CLOSER'])
  allocationMode?: 'FIXED' | 'ORDER_OWNER' | 'FINANCIAL_CLOSER';

  @ApiPropertyOptional({
    type: [CreateProfitShareAllocationDto],
    description:
      '成员分配规则列表（固定分配模式必填，按订单动态分配模式可选填兜底人员）',
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateProfitShareAllocationDto)
  allocations?: CreateProfitShareAllocationDto[];
}

export class CreateProfitShareRuleDto {
  @ApiProperty({ description: '分润规则名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    enum: ProfitShareRuleType,
    description:
      '规则类型: ORDER_PERCENTAGE (按订单比例分润), FIXED_MONTHLY (月度固定分账)',
    default: ProfitShareRuleType.ORDER_PERCENTAGE,
  })
  @IsEnum(ProfitShareRuleType)
  @IsOptional()
  ruleType?: ProfitShareRuleType;

  @ApiPropertyOptional({
    description: '关联产品品类/ID，按订单比例模式下必须与 channelId 至少填一项',
  })
  @IsString()
  @ValidateIf(
    (o: CreateProfitShareRuleDto) =>
      o.ruleType !== ProfitShareRuleType.FIXED_MONTHLY && !o.channelId,
  )
  @IsNotEmpty({
    message: '按订单比例模式下，限制品类和限制渠道必须至少选择一项',
  })
  productId?: string;

  @ApiPropertyOptional({
    description: '关联渠道ID，按订单比例模式下必须与 productId 至少填一项',
  })
  @IsNumber()
  @ValidateIf(
    (o: CreateProfitShareRuleDto) =>
      o.ruleType !== ProfitShareRuleType.FIXED_MONTHLY && !o.productId,
  )
  @IsNotEmpty({
    message: '按订单比例模式下，限制品类和限制渠道必须至少选择一项',
  })
  channelId?: number;

  @ApiProperty({ description: '生效开始时间' })
  @IsDateString()
  @IsNotEmpty()
  validStartTime: string;

  @ApiProperty({ description: '生效结束时间' })
  @IsDateString()
  @IsNotEmpty()
  validEndTime: string;

  @ApiPropertyOptional({
    enum: ProfitShareRuleStatus,
    description: '状态',
    default: ProfitShareRuleStatus.ACTIVE,
  })
  @IsEnum(ProfitShareRuleStatus)
  @IsOptional()
  status?: ProfitShareRuleStatus;

  @ApiProperty({
    type: [CreateProfitShareModuleDto],
    description: '分润模块配置列表',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProfitShareModuleDto)
  modules: CreateProfitShareModuleDto[];
}
