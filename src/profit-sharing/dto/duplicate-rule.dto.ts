import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { ProfitShareRuleStatus } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class DuplicateProfitShareRuleDto {
  @ApiPropertyOptional({ description: '新规则名称，未填写则默认为原规则名 + (副本)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '生效开始时间' })
  @IsOptional()
  @IsString()
  validStartTime?: string;

  @ApiPropertyOptional({ description: '生效结束时间' })
  @IsOptional()
  @IsString()
  validEndTime?: string;

  @ApiPropertyOptional({
    description: '规则状态，默认 DRAFT',
    enum: ProfitShareRuleStatus,
  })
  @IsOptional()
  @IsEnum(ProfitShareRuleStatus)
  status?: ProfitShareRuleStatus;
}

export type PeriodStrategy =
  | 'NEXT_MONTH'
  | 'SPECIFIC_MONTH'
  | 'CUSTOM_RANGE'
  | 'KEEP';

export class BatchDuplicateProfitShareRuleDto {
  @ApiProperty({ description: '待复制的规则ID列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  ruleIds: string[];

  @ApiPropertyOptional({
    description:
      '生效周期策略: NEXT_MONTH (顺延至下月), SPECIFIC_MONTH (指定自然月), CUSTOM_RANGE (自定义区间), KEEP (保持原周期)',
    enum: ['NEXT_MONTH', 'SPECIFIC_MONTH', 'CUSTOM_RANGE', 'KEEP'],
    default: 'NEXT_MONTH',
  })
  @IsOptional()
  @IsEnum(['NEXT_MONTH', 'SPECIFIC_MONTH', 'CUSTOM_RANGE', 'KEEP'])
  periodStrategy?: PeriodStrategy;

  @ApiPropertyOptional({
    description: '目标自然月份（例如 2026-10，当 periodStrategy 为 SPECIFIC_MONTH 时使用）',
    example: '2026-10',
  })
  @IsOptional()
  @IsString()
  targetMonth?: string;

  @ApiPropertyOptional({ description: '自定义开始时间 (当 periodStrategy 为 CUSTOM_RANGE 时使用)' })
  @IsOptional()
  @IsString()
  customStartTime?: string;

  @ApiPropertyOptional({ description: '自定义结束时间 (当 periodStrategy 为 CUSTOM_RANGE 时使用)' })
  @IsOptional()
  @IsString()
  customEndTime?: string;

  @ApiPropertyOptional({ description: '名称后缀，未传且顺延时会自动智能替换月份名称', example: ' (副本)' })
  @IsOptional()
  @IsString()
  nameSuffix?: string;

  @ApiPropertyOptional({
    description: '复制后规则的状态，默认 ACTIVE',
    enum: ProfitShareRuleStatus,
  })
  @IsOptional()
  @IsEnum(ProfitShareRuleStatus)
  status?: ProfitShareRuleStatus;
}
