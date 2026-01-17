/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-23 06:15:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-01 19:31:18
 * @FilePath: /lulab_backend/src/auth/services/jwt-user-lookup.service.ts
 * @Description:
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedUser, JwtUserLookup } from '../types/jwt.types';
import { UserRepository } from '@/user/repositories/user.repository';

@Injectable()
export class JwtUserLookupService implements JwtUserLookup {
  constructor(private readonly userRepo: UserRepository) {}

  async getAuthenticatedUserById(
    id: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.userRepo.getUserByIdWithProfileAndRoles(id);
    if (!user) return null;

    if (!user.active) {
      throw new UnauthorizedException('账户已被禁用');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('账户已被删除');
    }

    const roles =
      user.orgMembers && user.orgMembers.length > 0
        ? user.orgMembers.flatMap((orgMember) =>
            orgMember.memberRoles.map((mr) => mr.role.code),
          )
        : ['USER'];

    return {
      id: user.id,
      username: user.username,
      email: user.email || '',
      phone: user.phone,
      countryCode: user.countryCode,
      profile: user.profile as unknown as Record<string, unknown> | null,
      roles,
      active: user.active,
      emailVerified: !!user.emailVerifiedAt,
      phoneVerified: !!user.phoneVerifiedAt,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
