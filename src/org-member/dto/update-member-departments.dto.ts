import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class UpdateMemberDepartmentsDto {
  @ApiPropertyOptional({
    description: '主要部门 ID',
    example: 'clx0987654321fedcba',
  })
  @IsOptional()
  @IsString()
  primaryDeptId?: string;

  @ApiPropertyOptional({
    description: '部门 ID 列表（设置成员所属的所有部门，包括主部门）',
    example: ['clx1111111111111111', 'clx2222222222222222'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departmentIds?: string[];

  @ApiPropertyOptional({
    description: '是否追加部门（false 则完全替换）',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  append?: boolean;
}
