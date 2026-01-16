import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: '角色名称',
    example: '管理员',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: '角色描述',
    example: '系统管理员角色',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: '角色级别，数字越小权限越高',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  level?: number;

  @ApiPropertyOptional({
    description: '是否启用',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  active?: boolean;

  @ApiPropertyOptional({
    description: '权限 ID 列表',
    example: ['permission-id-1', 'permission-id-2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionIds?: string[];
}
