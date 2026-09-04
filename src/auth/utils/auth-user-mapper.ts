/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-08 14:54:39
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-09-04 16:00:00
 * @FilePath: /nove_api/src/auth/utils/auth-user-mapper.ts
 * @Description: 认证用户响应对象映射工具
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { User, UserProfile } from '@prisma/client';
import {
  AuthUserMinimalDto,
  AuthUserWithPermissionsDto,
  PermissionsResponseDto,
} from '@/auth/dto';
import type { AuthenticatedUser } from '@/auth/types/jwt.types';
import { DesensitizationUtil } from '@/common/utils/desensitization.util';

/**
 * 解析用户展示名称（按优先级：displayName -> username -> email -> maskedPhone -> fallback）
 */
export function resolveDisplayName(
  user: {
    profile?: { displayName?: unknown } | Record<string, unknown> | null;
    username?: string | null;
    email?: string | null;
    phone?: string | null;
  },
  fallback = 'Unknown',
): string {
  const displayName =
    typeof user.profile?.displayName === 'string'
      ? user.profile.displayName
      : undefined;

  return (
    displayName ||
    user.username ||
    user.email ||
    (user.phone ? DesensitizationUtil.maskPhone(user.phone) : '') ||
    fallback
  );
}

/**
 * 格式化精简用户信息（用于登录/注册成功后的响应）
 */
export function formatAuthUserResponse(
  user: User & {
    profile: UserProfile | null;
    roles?: Array<{ role: { code: string } }> | null;
  },
  currentOrgId?: string,
): AuthUserMinimalDto {
  const name =
    user.profile?.displayName ||
    user.username ||
    user.email ||
    user.phone ||
    'User';
  const roles =
    user.roles && user.roles.length > 0
      ? user.roles.map((r) => r.role.code)
      : ['USER'];

  return {
    id: user.id,
    name,
    roles,
    currentOrgId,
  };
}

/**
 * 格式化带权限的完整用户信息（用于 /auth/me 接口）
 */
export function formatAuthUserWithPermissions(
  user: AuthenticatedUser,
  perm: string[],
  currentOrgId?: string,
  avatar?: string,
): AuthUserWithPermissionsDto {
  return {
    id: user.id,
    username: user.username || undefined,
    email: user.email,
    phone: DesensitizationUtil.maskPhone(user.phone),
    countryCode: user.countryCode || undefined,
    name: resolveDisplayName(user),
    avatar,
    roles: user.roles || ['USER'],
    currentOrgId,
    perm,
    active: user.active,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    createdAt:
      user.createdAt instanceof Date
        ? user.createdAt.toISOString()
        : new Date(user.createdAt).toISOString(),
    lastLoginAt: user.lastLoginAt
      ? user.lastLoginAt instanceof Date
        ? user.lastLoginAt.toISOString()
        : new Date(user.lastLoginAt).toISOString()
      : undefined,
  };
}

/**
 * 格式化用户权限响应（用于 /auth/permissions 接口）
 */
export function formatPermissionsResponse(
  user: AuthenticatedUser,
  perm: string[],
): PermissionsResponseDto {
  return {
    id: user.id,
    name: resolveDisplayName(user),
    roles: user.roles || ['USER'],
    perm,
  };
}
