/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-07 21:59:35
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-09 01:51:54
 * @FilePath: /lulab_backend/src/auth/dto/auth-response.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { ApiProperty } from '@nestjs/swagger';
import { AuthUserMinimalDto } from './auth-user-minimal.dto';

export class AuthResponseDto {
  @ApiProperty({ description: '访问令牌' })
  accessToken: string;

  @ApiProperty({ description: '访问令牌过期时间（秒）', example: 900 })
  expiresIn: number;

  @ApiProperty({
    description:
      '刷新令牌（Web客户端通过HttpOnly Cookie返回，App客户端在响应体中返回）',
    required: false,
  })
  refreshToken?: string;

  @ApiProperty({
    description:
      '刷新令牌过期时间（秒），Web客户端通过HttpOnly Cookie返回，App客户端在响应体中返回',
    required: false,
    example: 2592000,
  })
  refreshExpiresIn?: number;

  @ApiProperty({ description: '用户基本信息', type: AuthUserMinimalDto })
  user: AuthUserMinimalDto;
}
