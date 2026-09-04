/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-09-04 17:15:00
 * @Description: 认证响应 DTO 集合 (AuthResponse, LogoutResponse, PermissionsResponse, AuthUser)
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserMinimalDto {
  @ApiProperty({ description: '用户ID' })
  id: string;

  @ApiProperty({ description: '用户名称' })
  name: string;

  @ApiProperty({ description: '用户角色代码列表', type: [String] })
  roles: string[];

  @ApiPropertyOptional({ description: '当前组织 ID' })
  currentOrgId?: string;
}

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

export class LogoutDetailsDto {
  @ApiProperty({ description: '访问令牌是否被撤销' })
  accessTokenRevoked: boolean;

  @ApiProperty({ description: '刷新令牌是否被撤销' })
  refreshTokenRevoked: boolean;

  @ApiProperty({ description: '是否撤销了所有设备的令牌', required: false })
  allDevicesLoggedOut?: boolean;

  @ApiProperty({ description: '撤销的令牌数量', required: false })
  revokedTokensCount?: number;
}

export class LogoutResponseDto {
  @ApiProperty({ description: '退出是否成功' })
  success: boolean;

  @ApiProperty({ description: '退出结果消息' })
  message: string;

  @ApiProperty({
    description: '详细信息',
    required: false,
    type: LogoutDetailsDto,
  })
  details?: LogoutDetailsDto;
}

export class PermissionsResponseDto {
  @ApiProperty({ description: '用户ID' })
  id: string;

  @ApiProperty({ description: '用户名称' })
  name: string;

  @ApiProperty({ description: '用户角色代码列表', type: [String] })
  roles: string[];

  @ApiProperty({ description: '权限列表', type: [String] })
  perm: string[];
}

export class AuthUserWithPermissionsDto {
  @ApiProperty({ description: '用户ID' })
  id: string;

  @ApiProperty({ description: '用户名', required: false })
  username?: string;

  @ApiProperty({ description: '邮箱' })
  email: string;

  @ApiProperty({ description: '手机号', required: false })
  phone?: string;

  @ApiProperty({ description: '国家代码', required: false })
  countryCode?: string;

  @ApiProperty({ description: '用户名称' })
  name: string;

  @ApiProperty({ description: '短期有效的头像签名 URL', required: false })
  avatar?: string;

  @ApiProperty({ description: '用户角色代码列表', type: [String] })
  roles: string[];

  @ApiPropertyOptional({ description: '当前组织 ID' })
  currentOrgId?: string;

  @ApiProperty({ description: '权限列表', type: [String] })
  perm: string[];

  @ApiProperty({ description: '账户是否激活' })
  active: boolean;

  @ApiProperty({ description: '邮箱是否验证' })
  emailVerified: boolean;

  @ApiProperty({ description: '手机号是否验证' })
  phoneVerified: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt: string;

  @ApiProperty({ description: '最后登录时间', required: false })
  lastLoginAt?: string;
}
