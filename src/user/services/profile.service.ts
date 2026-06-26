/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-23 06:15:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-02 03:25:07
 * @FilePath: /lulab_backend/src/user/services/profile.service.ts
 * @Description: 用户资料服务
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { UserQueryRepository } from '../repositories/user-query.repository';
import { UserCommandRepository } from '../repositories/user-command.repository';
import { UserProfileResponseDto } from '@/user/dto/user-profile-response.dto';
import { UpdateProfileDto } from '@/user/dto/update-profile.dto';
import { formatUserResponse } from '@/common/utils';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly userQueryRepo: UserQueryRepository,
    private readonly userCommandRepo: UserCommandRepository,
  ) {}

  async getProfile(userId: string): Promise<UserProfileResponseDto> {
    const user = await this.userQueryRepo.findWithProfile(userId);
    if (!user) {
      throw new BadRequestException('用户不存在');
    }
    return formatUserResponse(user);
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
    ip: string,
    userAgent?: string,
  ): Promise<UserProfileResponseDto> {
    this.logger.log(`用户 ${userId} 正在更新资料，IP: ${ip}, UA: ${userAgent}`);
    const { username, email, phone, countryCode, displayName, avatar, bio } =
      updateProfileDto;

    const existingUser = await this.userQueryRepo.findWithProfile(userId);
    if (!existingUser) {
      throw new BadRequestException('用户不存在');
    }

    if (username && username !== existingUser.username) {
      const usernameExists = await this.userQueryRepo.findByUsername(username);
      if (usernameExists) {
        throw new ConflictException('用户名已被使用');
      }
    }

    if (email && email !== existingUser.email) {
      const emailExists = await this.userQueryRepo.findByEmail(email);
      if (emailExists) {
        throw new ConflictException('邮箱已被使用');
      }
    }

    if (
      phone &&
      (phone !== existingUser.phone ||
        updateProfileDto.countryCode !== existingUser.countryCode)
    ) {
      const phoneExists = await this.userQueryRepo.findByPhone(
        updateProfileDto.countryCode || existingUser.countryCode || '',
        phone,
      );
      if (phoneExists) {
        throw new ConflictException('手机号已被使用');
      }
    }

    const profileUpdates: {
      displayName?: string;
      avatar?: string;
      bio?: string;
    } = {};

    if (displayName !== undefined) {
      profileUpdates.displayName =
        displayName ||
        existingUser.profile?.displayName ||
        username ||
        email?.split('@')[0] ||
        phone;
    }

    if (avatar !== undefined) {
      profileUpdates.avatar = avatar;
    }

    if (bio !== undefined) {
      profileUpdates.bio = bio;
    }

    const updatedUser = await this.userCommandRepo.updateProfile(userId, {
      ...(username !== undefined ? { username } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(countryCode !== undefined ? { countryCode } : {}),
      ...(Object.keys(profileUpdates).length
        ? { profile: profileUpdates }
        : {}),
    });

    return formatUserResponse(updatedUser);
  }
}
