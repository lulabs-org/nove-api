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
import { ApiProperty } from '@nestjs/swagger';
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
