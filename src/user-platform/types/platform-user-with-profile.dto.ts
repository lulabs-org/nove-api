/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29 19:52:24
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-30 14:09:38
 * @FilePath: /nove_api/src/user-platform/types/platform-user-with-profile.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlatformUserDto } from './platform-user.dto';

export class PlatformUserProfileDto {
  @ApiPropertyOptional({ description: '用户资料 ID' })
  id?: string;

  @ApiPropertyOptional({ description: '资料显示名称' })
  displayName?: string;

  @ApiPropertyOptional({ description: '头像地址' })
  avatar?: string;

  @ApiPropertyOptional({ description: '个人简介' })
  bio?: string;
}

export class PlatformUserLinkedUserDto {
  @ApiPropertyOptional({ description: '本地用户 ID' })
  id?: string;

  @ApiPropertyOptional({ description: '登录用户名' })
  username?: string;

  @ApiPropertyOptional({ description: '邮箱地址' })
  email?: string;

  @ApiPropertyOptional({
    description: '关联的用户资料',
    type: PlatformUserProfileDto,
  })
  profile?: PlatformUserProfileDto | null;
}

export class PlatformUserWithProfileDto extends PlatformUserDto {
  @ApiPropertyOptional({
    description: '关联的本地用户信息',
    type: PlatformUserLinkedUserDto,
  })
  user?: PlatformUserLinkedUserDto | null;
}
