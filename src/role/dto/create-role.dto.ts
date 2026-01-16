import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { RoleType } from '@prisma/client';

export class CreateRoleDto {
  @ApiProperty({
    description: '角色名称',
    example: '管理员',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '角色编码',
    example: 'admin',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: '角色描述',
    example: '系统管理员角色',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: '角色类型',
    enum: RoleType,
    example: RoleType.CUSTOM,
    default: RoleType.CUSTOM,
  })
  @IsEnum(RoleType)
  @IsOptional()
  type?: RoleType;

  @ApiProperty({
    description: '角色级别，数字越小权限越高',
    example: 1,
    default: 1,
  })
  @IsInt()
  @IsOptional()
  level?: number;

  @ApiProperty({
    description: '是否启用',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
