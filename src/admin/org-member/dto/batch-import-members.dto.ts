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
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateOrgMemberDto } from './create-org-member.dto';

export class BatchImportMemberItemDto extends CreateOrgMemberDto {}

export class BatchImportMemberDto {
  @ApiProperty({
    description: '成员数据列表',
    type: [BatchImportMemberItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchImportMemberItemDto)
  members: BatchImportMemberItemDto[];
}

export class BatchImportFailure {
  @ApiProperty({
    description: '成员在批量请求中的序号（从 0 开始）',
    example: 0,
  })
  index: number;

  @ApiPropertyOptional({
    description: '脱敏邮箱',
    example: 'zh***@example.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: '脱敏手机号',
    example: '138****8000',
  })
  phone?: string;

  @ApiProperty({
    description: '稳定错误码',
    example: 'CONFLICT',
  })
  code: string;

  @ApiProperty({
    description: '失败原因',
    example: 'User is already a member of this organization',
  })
  reason: string;
}

export class BatchImportResponse {
  @ApiProperty({
    description: '成功导入的成员数量',
    example: 8,
  })
  successCount: number;

  @ApiProperty({
    description: '失败的成员数量',
    example: 2,
  })
  failureCount: number;

  @ApiProperty({
    description: '失败的成员列表',
    type: [BatchImportFailure],
  })
  failures: BatchImportFailure[];
}
