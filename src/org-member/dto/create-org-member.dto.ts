import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';
import { MemberType } from '@prisma/client';

export class CreateOrgMemberDto {
  @ApiProperty({
    description: '用户 ID（绑定已有用户）',
    example: 'clx1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({
    description: '成员类型',
    enum: MemberType,
    example: MemberType.INTERNAL,
  })
  @IsOptional()
  @IsEnum(MemberType)
  type?: MemberType;

  @ApiPropertyOptional({
    description: '组织显示名称',
    example: '张三',
  })
  @IsOptional()
  @IsString()
  orgDisplayName?: string;

  @ApiPropertyOptional({
    description: '内部员工工号',
    example: 'EMP001',
  })
  @IsOptional()
  @IsString()
  employeeNo?: string;

  @ApiPropertyOptional({
    description: '主要部门 ID',
    example: 'clx0987654321fedcba',
  })
  @IsOptional()
  @IsString()
  primaryDeptId?: string;

  @ApiPropertyOptional({
    description: '外部公司名称（外部用户）',
    example: '某某供应商',
  })
  @IsOptional()
  @IsString()
  externalCompany?: string;

  @ApiPropertyOptional({
    description: '职位/头衔',
    example: '软件工程师',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: '部门 ID 列表（兼职部门）',
    example: ['clx1111111111111111', 'clx2222222222222222'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departmentIds?: string[];

  @ApiPropertyOptional({
    description: '角色 ID 列表',
    example: ['clx3333333333333333'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];
}
