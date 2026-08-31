/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-23 06:15:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-09 01:33:12
 * @FilePath: /lulab_backend/src/user/user.controller.ts
 * @Description:
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
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
import { User, CurrentUser } from '@/auth/decorators/user.decorator';
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
  async getProfile(@User() user: CurrentUser): Promise<UserProfileResponseDto> {
    return await this.profileService.getProfile(user.id);
  }

  @Put('profile')
  @RequireAuth('jwt')
  @ApiUpdateUserProfileDocs()
  async updateProfile(
    @User() user: CurrentUser,
    @Body(ValidationPipe) updateProfileDto: UpdateProfileDto,
    @Req() req: Request,
  ): Promise<UserProfileResponseDto> {
    const ip = this.getClientIp(req);
    const userAgent = req.get('User-Agent');
    return await this.profileService.updateProfile(
      user.id,
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
    @User() user: CurrentUser,
    @UploadedFile() file?: AvatarUploadFile,
  ): Promise<UserProfileResponseDto> {
    return this.profileService.uploadAvatar(user.id, file);
  }

  @Delete('profile/avatar')
  @RequireAuth('jwt')
  @ApiDeleteUserAvatarDocs()
  deleteAvatar(@User() user: CurrentUser): Promise<UserProfileResponseDto> {
    return this.profileService.deleteAvatar(user.id);
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
