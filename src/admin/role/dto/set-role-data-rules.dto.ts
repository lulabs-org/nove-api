import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class SetRoleDataRulesDto {
  @ApiProperty({
    description: '数据权限规则 ID 列表',
    example: ['cldemo01', 'cldemo02'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ruleIds: string[];
}
