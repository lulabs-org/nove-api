/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-01 16:16:47
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-06 01:55:23
 * @FilePath: /lulab_backend/src/common/utils/user-mapper.ts
 * @Description: 用户响应格式化工具函数
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { User, UserProfile } from '@prisma/client';
import { UserProfileResponseDto } from '@/user/dto/user-profile-response.dto';

export function formatUserResponse(
  user: User & { profile: UserProfile | null },
): UserProfileResponseDto {
  const profileData = user.profile
    ? ({
        name: user.profile.name || undefined,
        avatar: user.profile.avatar || undefined,
        bio: user.profile.bio || undefined,
        firstName: user.profile.firstName || undefined,
        lastName: user.profile.lastName || undefined,
        dateOfBirth: user.profile.dateOfBirth || undefined,
        gender: user.profile.gender || undefined,
        city: user.profile.city || undefined,
        country: user.profile.country || undefined,
      } as const)
    : undefined;

  return {
    id: user.id,
    username: user.username || undefined,
    email: user.email || '',
    countryCode: user.countryCode || undefined,
    phone: user.phone || undefined,
    emailVerified: !!user.emailVerifiedAt,
    phoneVerified: !!user.phoneVerifiedAt,
    lastLoginAt: user.lastLoginAt || undefined,
    createdAt: user.createdAt,
    profile: profileData,
  };
}
