/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29 19:52:24
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-29 19:52:26
 * @FilePath: /nove_api/src/user-platform/types/platform-user-with-profile.dto.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */
import { ApiProperty } from '@nestjs/swagger';
import { PlatformUser, Platform } from '@prisma/client';

export class PlatformUserWithProfileDto {
  @ApiProperty({ description: '平台用户ID' })
  id: string;

  @ApiProperty({ description: '平台类型', enum: Platform })
  platform: string;

  @ApiProperty({ description: '平台联合ID' })
  ptUnionId: string;

  @ApiProperty({ description: '平台用户ID', required: false })
  ptUserId?: string;

  @ApiProperty({ description: '显示名称', required: false })
  displayName?: string;

  @ApiProperty({ description: '国家代码', required: false })
  countryCode?: string;

  @ApiProperty({ description: '手机号', required: false })
  phone?: string;

  @ApiProperty({ description: '手机号哈希', required: false })
  phoneHash?: string;

  @ApiProperty({ description: '是否激活' })
  active: boolean;

  @ApiProperty({ description: '最后活跃时间' })
  lastSeenAt: Date;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiProperty({ description: '关联的用户信息', required: false })
  user?: {
    id: string;
    email?: string;
    username?: string;
    profile?: {
      id: string;
      displayName?: string;
      avatar?: string;
      bio?: string;
    };
  };
}
