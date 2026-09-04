/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-23 06:15:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-09-04 16:35:00
 * @FilePath: /nove_api/src/user/user.controller.ts
 * @Description: 用户控制器
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import {
  Controller,
  Delete,
  Get,
  Put,
  Body,
  Req,
  UploadedFile,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { NoPermissionRequired } from '@/admin/permission/decorators/permissions.decorator';
import { Request } from 'express';
import { ProfileService } from './services/profile.service';
import { Auth } from '@/auth/decorators/auth.decorator';
import { UpdateProfileDto } from '@/user/dto/update-profile.dto';
import { UserProfileResponseDto } from '@/user/dto/user-profile-response.dto';
import {
  ApiDeleteUserAvatarDocs,
  ApiGetUserProfileDocs,
  ApiUploadUserAvatarDocs,
  ApiUpdateUserProfileDocs,
} from './decorators/user.decorators';
import { RequireAuth } from '@/auth/decorators/require-auth.decorator';
import { AvatarUploadFile } from '@/user/types/avatar-upload-file';

@ApiTags('User')
@Controller('api/user')
@NoPermissionRequired()
export class UserController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('profile')
  @RequireAuth('jwt')
  @ApiGetUserProfileDocs()
  async getProfile(
    @Auth('userId') userId: string,
  ): Promise<UserProfileResponseDto> {
    return await this.profileService.getProfile(this.resolveUserId(userId));
  }

  @Put('profile')
  @RequireAuth('jwt')
  @ApiUpdateUserProfileDocs()
  async updateProfile(
    @Auth('userId') userId: string,
    @Body(ValidationPipe) updateProfileDto: UpdateProfileDto,
    @Req() req: Request,
  ): Promise<UserProfileResponseDto> {
    const ip = this.getClientIp(req);
    const userAgent = req.get('User-Agent');
    return await this.profileService.updateProfile(
      this.resolveUserId(userId),
      updateProfileDto,
      ip,
      userAgent,
    );
  }

  @Put('profile/avatar')
  @RequireAuth('jwt')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiUploadUserAvatarDocs()
  uploadAvatar(
    @Auth('userId') userId: string,
    @UploadedFile() file?: AvatarUploadFile,
  ): Promise<UserProfileResponseDto> {
    return this.profileService.uploadAvatar(this.resolveUserId(userId), file);
  }

  @Delete('profile/avatar')
  @RequireAuth('jwt')
  @ApiDeleteUserAvatarDocs()
  deleteAvatar(
    @Auth('userId') userId: string,
  ): Promise<UserProfileResponseDto> {
    return this.profileService.deleteAvatar(this.resolveUserId(userId));
  }

  private resolveUserId(userId: string | { id?: string }): string {
    return typeof userId === 'string' ? userId : userId?.id || '';
  }

  private getClientIp(req: Request): string {
    const xff = req.headers['x-forwarded-for'];
    const xReal = req.headers['x-real-ip'];
    const forwarded = Array.isArray(xff) ? xff[0] : xff?.split(',')[0];
    const realIp = Array.isArray(xReal) ? xReal[0] : xReal;
    return (
      forwarded?.trim() ||
      realIp?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      '127.0.0.1'
    );
  }
}
