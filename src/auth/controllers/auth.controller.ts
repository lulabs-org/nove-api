/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-04 18:05:33
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-09-04 16:00:00
 * @FilePath: /nove_api/src/auth/controllers/auth.controller.ts
 * @Description: 认证控制器（已遵循 Skinny Controller 重构）
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Get,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  ApiRegisterDocs,
  ApiLoginDocs,
  ApiResetPasswordDocs,
  ApiRefreshTokenDocs,
  ApiLogoutDocs,
  ApiGetMeDocs,
  ApiGetPermissionsDocs,
  Public,
  RequireAuth,
  Auth,
  ClientInfo,
  ClientInfoContext,
  BearerToken,
} from '../decorators';
import {
  RegisterDto,
  LoginDto,
  LogoutDto,
  AuthResponseDto,
  RefreshTokenDto,
  ResetPasswordDto,
  AuthUserWithPermissionsDto,
  PermissionsResponseDto,
} from '@/auth/dto';
import { AuthService } from '../services/auth.service';
import { ProfileService } from '@/user/services/profile.service';
import { AuthContext } from '../types/auth-context.interface';
import { AuthenticatedUser, ClientType } from '../types/jwt.types';
import { AuthCookieHelper } from '../utils/auth-cookie.helper';
import {
  formatAuthUserWithPermissions,
  formatPermissionsResponse,
} from '../utils/auth-user-mapper';
import { NoPermissionRequired } from '@/admin/permission/decorators/permissions.decorator';

@ApiTags('Auth')
@Controller({
  path: 'api/auth',
  version: '1',
})
@NoPermissionRequired()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly profileService: ProfileService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiRegisterDocs()
  async register(
    @Body() registerDto: RegisterDto,
    @ClientInfo() { ip, userAgent }: ClientInfoContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(registerDto, ip, userAgent);

    if (registerDto.clientType === ClientType.Web) {
      AuthCookieHelper.setRefreshToken(
        res,
        result.refreshToken!,
        result.refreshExpiresIn,
      );

      return {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        user: result.user,
      };
    }

    return result;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiLoginDocs()
  async login(
    @Body() loginDto: LoginDto,
    @ClientInfo() { ip, userAgent }: ClientInfoContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(loginDto, ip, userAgent);

    if (loginDto.clientType === ClientType.Web) {
      AuthCookieHelper.setRefreshToken(
        res,
        result.refreshToken!,
        result.refreshExpiresIn,
      );

      return {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        user: result.user,
      };
    }

    return result;
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiResetPasswordDocs()
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @ClientInfo() { ip, userAgent }: ClientInfoContext,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.resetPassword(resetPasswordDto, ip, userAgent);
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiRefreshTokenDocs()
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @ClientInfo() { ip, userAgent }: ClientInfoContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
    accessToken: string;
    expiresIn: number;
    refreshToken?: string;
    refreshExpiresIn?: number;
  }> {
    const refreshToken =
      refreshTokenDto.refreshToken ||
      (req.cookies?.refreshToken as string | undefined);

    if (!refreshToken) {
      throw new UnauthorizedException('刷新令牌不能为空');
    }

    const result = await this.authService.refreshToken(
      refreshToken,
      refreshTokenDto,
      ip,
      userAgent,
    );

    if (refreshTokenDto.clientType === ClientType.Web) {
      AuthCookieHelper.setRefreshToken(
        res,
        result.refreshToken,
        result.refreshExpiresIn,
      );

      return {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      };
    }

    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiLogoutDocs()
  @ApiBearerAuth()
  @RequireAuth('jwt')
  async logout(
    @Auth('userId') userId: string,
    @BearerToken() accessToken: string | undefined,
    @Req() req: Request,
    @Body() logoutDto: LogoutDto = {},
    @ClientInfo() { ip, userAgent }: ClientInfoContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
    success: boolean;
    message: string;
    details?: {
      accessTokenRevoked: boolean;
      refreshTokenRevoked: boolean;
      allDevicesLoggedOut?: boolean;
      allAccessTokensRevoked?: boolean;
      revokedTokensCount?: number;
    };
  }> {
    const token =
      accessToken ||
      (req.get('authorization')?.startsWith('Bearer ')
        ? req.get('authorization')!.slice('Bearer '.length).trim()
        : undefined);

    if (!token) {
      throw new UnauthorizedException('未找到访问令牌');
    }

    const isWebClient = logoutDto.clientType === ClientType.Web;
    const refreshToken =
      logoutDto.refreshToken ||
      (isWebClient
        ? (req.cookies?.refreshToken as string | undefined)
        : undefined);

    const logoutResult = await this.authService.logout(userId, token, {
      refreshToken,
      deviceId: logoutDto.deviceId,
      revokeAllDevices: logoutDto.revokeAllDevices,
      userAgent,
      ip,
    });

    if (isWebClient) {
      AuthCookieHelper.clearRefreshToken(res);
    }

    return {
      success: true,
      message: logoutResult.message,
      details: {
        accessTokenRevoked: logoutResult.accessTokenRevoked,
        refreshTokenRevoked: logoutResult.refreshTokenRevoked,
        allDevicesLoggedOut: logoutResult.allDevicesLoggedOut,
        allAccessTokensRevoked: logoutResult.allAccessTokensRevoked,
        revokedTokensCount: logoutResult.revokedTokensCount,
      },
    };
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiGetMeDocs()
  @ApiBearerAuth()
  @RequireAuth('jwt')
  async getMe(
    @Auth('user') user?: AuthenticatedUser,
    @Auth() auth?: AuthContext,
  ): Promise<AuthUserWithPermissionsDto> {
    const currentUser = user || auth?.user;
    if (!currentUser) {
      throw new UnauthorizedException('未找到当前用户信息');
    }

    const roles = currentUser.roles || ['USER'];
    const perm =
      auth?.permissions && auth.permissions.length > 0
        ? auth.permissions
        : await this.authService.getPermissionsByRoles(roles);

    const currentOrgId =
      auth?.orgId ??
      (await this.authService.resolveCurrentOrgId(currentUser.id));

    const avatar = this.profileService.getReadableAvatarUrl(
      currentUser.profile?.avatar as string | undefined,
    );

    return formatAuthUserWithPermissions(
      currentUser,
      perm,
      currentOrgId ?? undefined,
      avatar,
    );
  }

  @Get('api-key/validate')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @RequireAuth('api_key')
  validateApiKey(): { authenticated: true } {
    return { authenticated: true };
  }

  @Get('permissions')
  @HttpCode(HttpStatus.OK)
  @ApiGetPermissionsDocs()
  @ApiBearerAuth()
  @RequireAuth('jwt')
  async getPermissions(
    @Auth('user') user?: AuthenticatedUser,
    @Auth() auth?: AuthContext,
  ): Promise<PermissionsResponseDto> {
    const currentUser = user || auth?.user;
    if (!currentUser) {
      throw new UnauthorizedException('未找到当前用户信息');
    }

    const roles = currentUser.roles || ['USER'];
    const perm =
      auth?.permissions && auth.permissions.length > 0
        ? auth.permissions
        : await this.authService.getPermissionsByRoles(roles);

    return formatPermissionsResponse(currentUser, perm);
  }
}
