import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { MemberType } from '@prisma/client';

export class CreateOrgMemberDto {
  @ApiPropertyOptional({
    description: '邮箱（手机号与邮箱至少填写一个）',
    example: 'zhangsan@example.com',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @ValidateIf(
    (dto: CreateOrgMemberDto) => dto.email !== undefined || !dto.phone,
  )
  @IsEmail({}, { message: '邮箱格式不正确，手机号与邮箱至少填写一个' })
  email?: string;

  @ApiPropertyOptional({
    description: '国家代码；填写手机号时必填',
    example: '+86',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((dto: CreateOrgMemberDto) => dto.phone !== undefined)
  @IsString()
  @Matches(/^\+?\d{1,4}$/, { message: '国家代码格式不正确' })
  countryCode?: string;

  @ApiPropertyOptional({
    description: '手机号（手机号与邮箱至少填写一个）',
    example: '13800138000',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf(
    (dto: CreateOrgMemberDto) => dto.phone !== undefined || !dto.email,
  )
  @IsString()
  @IsNotEmpty({ message: '手机号与邮箱至少填写一个' })
  @Matches(/^[\d\s()-]+$/, { message: '手机号格式不正确' })
  phone?: string;

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
