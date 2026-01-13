/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-01 21:54:50
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-14 01:43:58
 * @FilePath: /nove_api/src/auth/services/token.service.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import {
  Injectable,
  UnauthorizedException,
  Logger,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigType } from '@nestjs/config';
import { jwtConfig } from '@/configs/jwt.config';
import { UserRepository } from '@/user/repositories/user.repository';
import { RefreshTokenRepository } from '@/auth/repositories/refresh-token.repository';
import { randomUUID } from 'node:crypto';
import { TokenBlacklistService } from './token-blacklist.service';
import { TokenBlacklistScope } from '@/auth/types/jwt.types';
import {
  TokenGenerationContext,
  LogoutOptions,
  LogoutResult,
} from '@/auth/types';
import { parseDurationToMs, generateRandomToken } from '@/common/utils';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepo: UserRepository,
    private readonly refreshTokenRepo: RefreshTokenRepository,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
    private readonly tokenBlacklist: TokenBlacklistService,
  ) {
    this.accessSecret = this.config.accessSecret;
    this.accessExpiresIn = this.config.accessExpiresIn;
  }

  /**
   * 生成令牌并存储刷新令牌到数据库
   */
  async generateTokens(
    userId: string,
    context?: TokenGenerationContext,
  ): Promise<{
    accessToken: string;
    expiresIn: number;
    refreshToken: string;
    refreshExpiresIn: number;
  }> {
    const payload = { sub: userId };
    const accessJti = randomUUID();

    const accessToken = this.jwtService.sign(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpiresIn,
      jwtid: accessJti,
    });

    const refreshToken = generateRandomToken();

    const expiresIn = Math.floor(
      parseDurationToMs(this.accessExpiresIn) / 1000,
    );

    const refreshExpiresInSeconds = Math.floor(
      parseDurationToMs(this.refreshExpiresIn) / 1000,
    );

    const expiresAt = new Date(Date.now() + refreshExpiresInSeconds * 1000);

    try {
      await this.refreshTokenRepo.createRefreshToken({
        userId,
        token: refreshToken,
        jti: undefined,
        expiresAt,
        deviceInfo: context?.deviceInfo,
        deviceId: context?.deviceId,
        userAgent: context?.userAgent,
        ip: context?.ip,
      });
    } catch (error) {
      this.logger.error('Failed to store refresh token', error);
      throw new InternalServerErrorException('生成刷新令牌失败');
    }

    return {
      accessToken,
      expiresIn,
      refreshToken,
      refreshExpiresIn: refreshExpiresInSeconds,
    };
  }

  async refreshToken(
    refreshToken: string,
    context?: TokenGenerationContext,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  }> {
    try {
      const oldTokenRecord =
        await this.refreshTokenRepo.findByToken(refreshToken);
      if (!oldTokenRecord || oldTokenRecord.revokedAt) {
        throw new UnauthorizedException('刷新令牌无效或已过期');
      }

      const user = await this.userRepo.getUserById(oldTokenRecord.userId);
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      const accessToken = this.jwtService.sign(
        { sub: user.id },
        {
          secret: this.accessSecret,
          expiresIn: this.accessExpiresIn,
          jwtid: randomUUID(),
        },
      );

      const newRefreshToken = generateRandomToken();

      const expiresIn = Math.floor(
        parseDurationToMs(this.accessExpiresIn) / 1000,
      );

      const refreshExpiresInSeconds = Math.floor(
        parseDurationToMs(this.refreshExpiresIn) / 1000,
      );

      const newExpiresAt = new Date(
        Date.now() + refreshExpiresInSeconds * 1000,
      );

      try {
        await this.refreshTokenRepo.createRefreshToken({
          userId: user.id,
          token: newRefreshToken,
          jti: undefined,
          expiresAt: newExpiresAt,
          deviceInfo:
            context?.deviceInfo || oldTokenRecord.deviceInfo || undefined,
          deviceId: context?.deviceId || oldTokenRecord.deviceId || undefined,
          userAgent:
            context?.userAgent || oldTokenRecord.userAgent || undefined,
          ip: context?.ip || oldTokenRecord.ip || undefined,
        });
      } catch (error) {
        this.logger.error(
          'Failed to store new refresh token during rotation',
          error,
        );
        throw new InternalServerErrorException('刷新令牌轮换失败');
      }

      try {
        await this.refreshTokenRepo.revokeToken(refreshToken);
      } catch (error) {
        this.logger.error('Failed to revoke old refresh token', error);
      }

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn,
        refreshExpiresIn: refreshExpiresInSeconds,
      };
    } catch (error) {
      this.logger.error('Refresh token validation failed', error);
      throw new UnauthorizedException('刷新令牌无效');
    }
  }

  /**
   * 全面的登出功能：撤销访问令牌和刷新令牌
   */
  async logout(
    userId: string,
    accessToken: string,
    options: LogoutOptions = {},
  ): Promise<LogoutResult> {
    const result: LogoutResult = {
      accessTokenRevoked: false,
      refreshTokenRevoked: false,
      message: '',
    };

    try {
      const accessTokenResult = await this.tokenBlacklist.add(
        accessToken,
        TokenBlacklistScope.AccessToken,
      );
      result.accessTokenRevoked = accessTokenResult.added;

      if (options.refreshToken) {
        try {
          const revokedToken = await this.refreshTokenRepo.revokeToken(
            options.refreshToken,
          );
          result.refreshTokenRevoked = !!revokedToken;
        } catch (error) {
          this.logger.warn('Failed to revoke refresh token', error);
        }
      }

      if (options.revokeAllDevices) {
        const revokedCount =
          await this.refreshTokenRepo.revokeAllTokensByUserId(userId);
        result.allDevicesLoggedOut = true;
        result.revokedTokensCount = revokedCount;
      } else if (options.deviceId) {
        const revokedCount = await this.refreshTokenRepo.revokeTokensByDeviceId(
          userId,
          options.deviceId,
        );
        result.revokedTokensCount = revokedCount;
      } else if (options.refreshToken) {
        result.revokedTokensCount = result.refreshTokenRevoked ? 1 : 0;
      }

      if (result.allDevicesLoggedOut) {
        result.message = `退出登录成功，已撤销所有设备的 ${result.revokedTokensCount} 个令牌`;
      } else if (result.revokedTokensCount && result.revokedTokensCount > 0) {
        result.message = `退出登录成功，已撤销当前设备的 ${result.revokedTokensCount} 个令牌`;
      } else {
        result.message = '退出登录成功';
      }

      this.logger.log(
        `User ${userId} logged out: access=${result.accessTokenRevoked}, refresh=${result.refreshTokenRevoked}, allDevices=${result.allDevicesLoggedOut}`,
      );

      return result;
    } catch (error) {
      this.logger.error('Logout failed', error);
      result.message = '退出登录失败';
      return result;
    }
  }
}
