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
  Get,
  Put,
  Body,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ProfileService } from './services/profile.service';
import { User, CurrentUser } from '@/auth/decorators/user.decorator';
import { UpdateProfileDto } from '@/user/dto/update-profile.dto';
import { UserProfileResponseDto } from '@/user/dto/user-profile-response.dto';
import {
  ApiGetUserProfileDocs,
  ApiUpdateUserProfileDocs,
} from './decorators/user.decorators';

@ApiTags('User')
@Controller('api/user')
export class UserController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('profile')
  @ApiGetUserProfileDocs()
  async getProfile(@User() user: CurrentUser): Promise<UserProfileResponseDto> {
    return await this.profileService.getProfile(user.id);
  }

  @Put('profile')
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
