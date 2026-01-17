/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-17 20:49:14
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-17 20:50:05
 * @FilePath: /nove_api/src/org-member/dto/batch-import-members.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class BatchImportMemberItemDto {
  @ApiProperty({
    description: '用户 ID',
    example: 'clx1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

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
    description: '职位/头衔',
    example: '软件工程师',
  })
  @IsOptional()
  @IsString()
  title?: string;
}

export class BatchImportMemberDto {
  @ApiProperty({
    description: '成员数据列表',
    type: [BatchImportMemberItemDto],
  })
  @IsArray()
  @IsNotEmpty()
  members: BatchImportMemberItemDto[];
}
