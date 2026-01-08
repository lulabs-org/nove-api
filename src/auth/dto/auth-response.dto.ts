/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-07 21:59:35
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-08 14:44:45
 * @FilePath: /lulab_backend/src/auth/dto/auth-response.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { ApiProperty } from '@nestjs/swagger';
import { AuthUserResponseDto } from './auth-user-response.dto';

export class AuthResponseDto {
  @ApiProperty({ description: '访问令牌' })
  accessToken: string;

  @ApiProperty({ description: '访问令牌过期时间（秒）', example: 900 })
  expiresIn: number;

  @ApiProperty({ description: '刷新令牌' })
  refreshToken: string;

  @ApiProperty({ description: '刷新令牌过期时间（秒）', example: 2592000 })
  refreshExpiresIn: number;

  @ApiProperty({ description: '用户基本信息', type: AuthUserResponseDto })
  user: AuthUserResponseDto;
}
