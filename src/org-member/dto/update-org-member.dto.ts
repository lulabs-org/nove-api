import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { MemberType } from '@prisma/client';

export class UpdateOrgMemberDto {
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
    description: '入职日期',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  joinedAt?: string;
}
