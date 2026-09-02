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
import { ProfitShareRuleStatus } from '@prisma/client';

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

  @ApiProperty({
    description: '在当前模块内的分配比例，例如 0.5',
    example: 0.5,
  })
  @IsNumber()
  @IsNotEmpty()
  allocationRatio: number;
}

export class CreateProfitShareModuleDto {
  @ApiPropertyOptional({ description: '记录ID，供更新时使用' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ description: '模块名称，如：关单、运营对接' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '该模块占总基数的比例，例如 0.04',
    example: 0.04,
  })
  @IsNumber()
  @IsNotEmpty()
  shareRatio: number;

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

  @ApiProperty({
    type: [CreateProfitShareAllocationDto],
    description: '成员分配规则列表',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProfitShareAllocationDto)
  allocations: CreateProfitShareAllocationDto[];
}

export class CreateProfitShareRuleDto {
  @ApiProperty({ description: '分润规则名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '关联产品品类/ID，必须与 channelId 至少填一项' })
  @IsString()
  @ValidateIf((o) => !o.channelId)
  @IsNotEmpty({ message: '限制品类和限制渠道必须至少选择一项' })
  productId?: string;

  @ApiPropertyOptional({ description: '关联渠道ID，必须与 productId 至少填一项' })
  @IsNumber()
  @ValidateIf((o) => !o.productId)
  @IsNotEmpty({ message: '限制品类和限制渠道必须至少选择一项' })
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
