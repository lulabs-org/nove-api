/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-08 14:54:39
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-09 01:21:23
 * @FilePath: /lulab_backend/src/common/utils/auth-user-mapper.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { User, UserProfile } from '@prisma/client';
import { AuthUserResponseDto } from '@/auth/dto/auth-user-response.dto';

export function formatAuthUserResponse(
  user: User & {
    profile: UserProfile | null;
    roles?: Array<{ role: { code: string } }> | null;
  },
): AuthUserResponseDto {
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
    username: user.username || undefined,
    email: user.email || '',
    phone: user.phone || undefined,
    countryCode: user.countryCode || undefined,
    name,
    avatar: user.profile?.avatar || undefined,
    roles,
    active: user.active,
    emailVerified: !!user.emailVerifiedAt,
    phoneVerified: !!user.phoneVerifiedAt,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString(),
  };
}
