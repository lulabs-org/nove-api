import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateDataPermissionRuleDto {
  @ApiPropertyOptional({
    description: '规则名称',
    example: '只能查看本部门数据',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: '规则描述',
    example: '用户只能查看本部门的数据',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '资源标识', example: 'user' })
  @IsString()
  @IsOptional()
  resource?: string;

  @ApiPropertyOptional({
    description: '权限条件（JSON格式）',
    example: '{"departmentId": "${user.departmentId}"}',
  })
  @IsString()
  @IsOptional()
  condition?: string;

  @ApiPropertyOptional({ description: '是否启用', example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  active?: boolean;
}
