import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDataPermissionRuleDto {
  @ApiProperty({ description: '规则名称', example: '只能查看本部门数据' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: '规则编码（已废弃，创建时由系统自动生成）',
    example: 'dept_only',
    deprecated: true,
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({
    description: '规则描述',
    example: '用户只能查看本部门的数据',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '资源标识', example: 'user' })
  @IsString()
  @IsNotEmpty()
  resource: string;

  @ApiPropertyOptional({
    description: '操作类型（如 read, update, delete, export 或 *）',
    example: '*',
    default: '*',
  })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiProperty({
    description: '权限条件（JSON格式）',
    example: '{"departmentId": "${user.departmentId}"}',
  })
  @IsString()
  @IsNotEmpty()
  condition: string;

  @ApiProperty({ description: '是否启用', example: true, default: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  active?: boolean;
}
