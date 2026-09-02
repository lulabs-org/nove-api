import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateProfitShareRuleDto, CreateProfitShareModuleDto } from './create-profit-share-rule.dto';
import { IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProfitShareRuleDto extends PartialType(CreateProfitShareRuleDto) {
  @ApiPropertyOptional({ type: [CreateProfitShareModuleDto], description: '分润模块配置列表' })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateProfitShareModuleDto)
  modules?: CreateProfitShareModuleDto[];
}
