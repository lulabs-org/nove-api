import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { PermissionType } from '@prisma/client';
import { Transform } from 'class-transformer';

export class UpdatePermissionDto {
  @ApiPropertyOptional({ description: '权限名称', example: '查看用户' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '权限描述', example: '查看用户列表' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '资源标识', example: 'user' })
  @IsString()
  @IsOptional()
  resource?: string;

  @ApiPropertyOptional({ description: '操作类型', example: 'read' })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({
    description: '权限类型',
    enum: PermissionType,
    example: PermissionType.API,
  })
  @IsEnum(PermissionType)
  @IsOptional()
  type?: PermissionType;

  @ApiPropertyOptional({ description: '父权限ID' })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: '权限层级', example: 1 })
  @IsInt()
  @IsOptional()
  level?: number;

  @ApiPropertyOptional({ description: '排序', example: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

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
