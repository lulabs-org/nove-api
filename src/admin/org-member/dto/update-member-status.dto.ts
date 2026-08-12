/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-17 20:48:32
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-17 20:48:33
 * @FilePath: /nove_api/src/org-member/dto/update-member-status.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { MemberStatus } from '@prisma/client';

export class UpdateMemberStatusDto {
  @ApiProperty({
    description: '成员状态',
    enum: MemberStatus,
    example: MemberStatus.ACTIVE,
  })
  @IsEnum(MemberStatus)
  @IsNotEmpty()
  status: MemberStatus;
}
