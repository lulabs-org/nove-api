/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-09-04 16:00:00
 * @Description: 认证聚合门面服务 (Auth Facade Service)
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import { RegisterService } from './register.service';
import { LoginService } from './login.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { LogoutOptions, LogoutResult } from '@/auth/types';
import { TokenBlacklistService } from './token-blacklist.service';
import { PermService } from '@/admin/permission/services/permission.service';
import { UserOrgService } from '@/admin/api-key/services/user-organization.service';
import {
  RegisterDto,
  LoginDto,
  ResetPasswordDto,
  RefreshTokenDto,
  AuthResponseDto,
} from '@/auth/dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly registerService: RegisterService,
    private readonly loginService: LoginService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly tokenBlacklist: TokenBlacklistService,
    private readonly permService: PermService,
    private readonly userOrgService: UserOrgService,
  ) {}

  /**
   * 用户注册并自动补全当前组织 ID
   */
  async register(
    registerDto: RegisterDto,
    ip: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const result = await this.registerService.register(
      registerDto,
      ip,
      userAgent,
    );
    const currentOrgId = await this.resolveCurrentOrgId(result.user.id);

    return {
      ...result,
      user: {
        ...result.user,
        currentOrgId,
      },
    };
  }

  /**
   * 用户登录并自动补全当前组织 ID
   */
  async login(
    loginDto: LoginDto,
    ip: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const result = await this.loginService.login(loginDto, ip, userAgent);
    const currentOrgId = await this.resolveCurrentOrgId(result.user.id);

    return {
      ...result,
      user: {
        ...result.user,
        currentOrgId,
      },
    };
  }

  /**
   * 重置密码
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    ip: string,
    userAgent?: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.passwordService.resetPassword(resetPasswordDto, ip, userAgent);
  }

  /**
   * 刷新 Token
   */
  async refreshToken(
    refreshToken: string,
    dto: RefreshTokenDto,
    ip: string,
    userAgent?: string,
  ) {
    return this.tokenService.refreshToken(refreshToken, {
      ip,
      userAgent,
      deviceInfo: dto.deviceInfo,
      deviceId: dto.deviceId,
    });
  }

  /**
   * 登出流程（含黑名单兜底与结构化日志）
   */
  async logout(
    userId: string,
    accessToken: string,
    options: LogoutOptions = {},
  ): Promise<LogoutResult> {
    try {
      const result = await this.tokenService.logout(
        userId,
        accessToken,
        options,
      );

      this.logger.log(
        `User ${userId} logout: ${JSON.stringify({
          accessRevoked: result.accessTokenRevoked,
          refreshRevoked: result.refreshTokenRevoked,
          allDevices: result.allDevicesLoggedOut,
          revokedCount: result.revokedTokensCount,
          ip: options.ip,
          userAgent: options.userAgent,
        })}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Logout failed for user ${userId}, applying fallback revocation`,
        error,
      );

      try {
        await this.tokenBlacklist.add(accessToken);
      } catch {
        // 忽略黑名单兜底异常
      }

      return {
        accessTokenRevoked: true,
        refreshTokenRevoked: false,
        message: '退出登录部分成功，当前会话已终止',
      };
    }
  }

  /**
   * 根据角色解析权限代码列表
   */
  async getPermissionsByRoles(roles: string[] = ['USER']): Promise<string[]> {
    try {
      return await this.permService.getPermByRoleCodes(roles);
    } catch (error) {
      this.logger.warn(
        `Failed to resolve permissions for roles ${roles.join(',')}: ${error}`,
      );
      return [];
    }
  }

  /**
   * 解析当前用户的默认/主组织 ID
   */
  async resolveCurrentOrgId(userId: string): Promise<string | undefined> {
    try {
      return await this.userOrgService.getPrimaryOrgId(userId);
    } catch {
      return undefined;
    }
  }
}
