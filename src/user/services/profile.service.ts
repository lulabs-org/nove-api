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
  Inject,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { UserQueryRepository } from '../repositories/user-query.repository';
import { UserCommandRepository } from '../repositories/user-command.repository';
import { UserProfileResponseDto } from '@/user/dto/user-profile-response.dto';
import { UpdateProfileDto } from '@/user/dto/update-profile.dto';
import { formatUserResponse } from '@/common/utils';
import {
  OBJECT_STORAGE,
  ObjectStorage,
} from '@/storage/object-storage.interface';
import { AvatarUploadFile } from '@/user/types/avatar-upload-file';
import { sharpFactory } from '@/common/utils/sharp-factory';

const AVATAR_MAX_FILE_SIZE = 5 * 1024 * 1024;
const AVATAR_MAX_INPUT_PIXELS = 20_000_000;
const AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const AVATAR_FORMATS = new Set(['jpeg', 'png', 'webp']);
const AVATAR_FORMAT_MIME_TYPES: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly userQueryRepo: UserQueryRepository,
    private readonly userCommandRepo: UserCommandRepository,
    @Inject(OBJECT_STORAGE)
    private readonly objectStorage: ObjectStorage,
  ) {}

  async getProfile(userId: string): Promise<UserProfileResponseDto> {
    const user = await this.userQueryRepo.withProfile(userId);
    if (!user) {
      throw new BadRequestException('用户不存在');
    }
    return this.formatResponse(user);
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
    ip: string,
    userAgent?: string,
  ): Promise<UserProfileResponseDto> {
    this.logger.log(`用户 ${userId} 正在更新资料，IP: ${ip}, UA: ${userAgent}`);
    const { username, displayName, bio } = updateProfileDto;

    const existingUser = await this.userQueryRepo.withProfile(userId);
    if (!existingUser) {
      throw new BadRequestException('用户不存在');
    }

    if (username && username !== existingUser.username) {
      const usernameExists = await this.userQueryRepo.byUsername(username);
      if (usernameExists) {
        throw new ConflictException('用户名已被使用');
      }
    }

    const profileUpdates: {
      displayName?: string;
      bio?: string;
    } = {};

    if (displayName !== undefined) {
      profileUpdates.displayName =
        displayName ||
        existingUser.profile?.displayName ||
        username ||
        existingUser.email?.split('@')[0] ||
        existingUser.phone ||
        undefined;
    }

    if (bio !== undefined) {
      profileUpdates.bio = bio;
    }

    const updatedUser = await this.userCommandRepo.updateProfile(userId, {
      ...(username !== undefined ? { username } : {}),
      ...(Object.keys(profileUpdates).length
        ? { profile: profileUpdates }
        : {}),
    });

    return this.formatResponse(updatedUser);
  }

  async uploadAvatar(
    userId: string,
    file?: AvatarUploadFile,
  ): Promise<UserProfileResponseDto> {
    if (!file) {
      throw new BadRequestException('请选择要上传的头像文件');
    }
    if (file.size > AVATAR_MAX_FILE_SIZE) {
      throw new BadRequestException('头像文件不能超过 5 MB');
    }
    if (!AVATAR_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('头像仅支持 JPEG、PNG 或 WebP 格式');
    }

    const existingUser = await this.userQueryRepo.withProfile(userId);
    if (!existingUser) {
      throw new BadRequestException('用户不存在');
    }

    const processed = await this.processAvatar(file.buffer, file.mimetype);
    const key = `avatars/${userId}/${randomUUID()}.webp`;
    const stored = await this.objectStorage.putObject({
      key,
      body: processed,
      contentType: 'image/webp',
      cacheControl: 'private, max-age=0, no-store',
      access: 'private',
    });

    let updatedUser: Awaited<ReturnType<UserCommandRepository['updateAvatar']>>;
    try {
      updatedUser = await this.userCommandRepo.updateAvatar(userId, stored.url);
    } catch (error) {
      await this.deleteObjectQuietly(stored.key, '回收未关联的新头像');
      throw error;
    }

    const oldKey = existingUser.profile?.avatar
      ? this.objectStorage.getManagedKey(existingUser.profile.avatar)
      : null;
    if (oldKey && oldKey !== stored.key) {
      void this.deleteObjectQuietly(oldKey, '清理被替换的旧头像');
    }

    return this.formatResponse(updatedUser);
  }

  async deleteAvatar(userId: string): Promise<UserProfileResponseDto> {
    const existingUser = await this.userQueryRepo.withProfile(userId);
    if (!existingUser) {
      throw new BadRequestException('用户不存在');
    }

    const oldKey = existingUser.profile?.avatar
      ? this.objectStorage.getManagedKey(existingUser.profile.avatar)
      : null;
    const updatedUser = await this.userCommandRepo.updateAvatar(userId, null);

    if (oldKey) {
      void this.deleteObjectQuietly(oldKey, '清理已删除的头像');
    }

    return this.formatResponse(updatedUser);
  }

  getReadableAvatarUrl(avatar?: string | null): string | undefined {
    if (!avatar) return undefined;
    try {
      return this.objectStorage.getReadUrl(avatar);
    } catch (error) {
      this.logger.warn(
        `生成头像临时访问地址失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    }
  }

  private formatResponse(
    user: Parameters<typeof formatUserResponse>[0],
  ): UserProfileResponseDto {
    const response = formatUserResponse(user);
    if (response.profile?.avatar) {
      response.profile.avatar = this.getReadableAvatarUrl(
        response.profile.avatar,
      );
    }
    return response;
  }

  private async processAvatar(
    buffer: Buffer,
    declaredMimeType: string,
  ): Promise<Buffer> {
    try {
      const image = sharpFactory(buffer, {
        failOn: 'warning',
        limitInputPixels: AVATAR_MAX_INPUT_PIXELS,
      });
      const metadata = await image.metadata();
      if (!metadata.format || !AVATAR_FORMATS.has(metadata.format)) {
        throw new Error('unsupported image format');
      }
      if (AVATAR_FORMAT_MIME_TYPES[metadata.format] !== declaredMimeType) {
        throw new Error('image MIME type does not match its contents');
      }

      return await image
        .rotate()
        .resize(512, 512, { fit: 'cover', position: 'centre' })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        '头像文件无法解析、格式不受支持或图片尺寸过大',
      );
    }
  }

  private async deleteObjectQuietly(
    key: string,
    action: string,
  ): Promise<void> {
    try {
      await this.objectStorage.deleteObject(key);
    } catch (error) {
      this.logger.warn(
        `${action}失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
