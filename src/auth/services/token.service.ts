/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-01 21:54:50
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-14 20:00:39
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
import { UserQueryRepository } from '@/user/repositories/user-query.repository';
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
    private readonly userRepo: UserQueryRepository,
    private readonly refreshTokenRepo: RefreshTokenRepository,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
    private readonly tokenBlacklist: TokenBlacklistService,
  ) {
    this.accessSecret = this.config.accessSecret;
    this.accessExpiresIn = this.config.accessExpiresIn;
    this.refreshExpiresIn = this.config.refreshExpiresIn;
  }

  /** access token 的 TTL（秒），供批量拉黑时计算黑名单过期时间 */
  get accessTokenTtlSec(): number {
    return Math.floor(parseDurationToMs(this.accessExpiresIn) / 1000);
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
    // 读取用户当前令牌版本，快照进 JWT ver 声明；密码变更递增 tokenVersion 后，
    // 旧 ver 的 token 会在 JwtStrategy 校验时被拒绝
    const user = await this.userRepo.byId(userId);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const payload = { sub: userId, ver: user.tokenVersion };
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
        jti: accessJti,
        expiresAt,
        deviceInfo: context?.deviceInfo,
        deviceId: context?.deviceId,
        userAgent: context?.userAgent,
        ip: context?.ip,
        tokenVersion: user.tokenVersion,
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
      // 1. 预检：读取记录做业务校验（快速失败路径）
      const oldTokenRecord =
        await this.refreshTokenRepo.findByToken(refreshToken);
      if (!oldTokenRecord || oldTokenRecord.revokedAt) {
        throw new UnauthorizedException('刷新令牌无效或已过期');
      }

      const user = await this.userRepo.byId(oldTokenRecord.userId);
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      // 2. 版本护栏：记录诞生时的版本必须等于用户当前版本。
      // 记录属于密码重置前的旧会话（即使因竞态漏网未被 revokeAll 撤销）时，
      // 此处直接拒绝换发，阻断旧会话穿透密码重置。
      if (oldTokenRecord.tokenVersion !== user.tokenVersion) {
        this.logger.warn(
          `Refresh token rejected by version guard: user=${user.id}, record ver=${oldTokenRecord.tokenVersion}, current ver=${user.tokenVersion}`,
        );
        throw new UnauthorizedException('刷新令牌已失效，请重新登录');
      }

      // 3. 原子消费：单条条件 UPDATE 完成"校验+撤销"，与密码重置的
      // revokeAll 在行级互斥，消除"先通过校验、后落库新记录"的竞态窗口
      const newRefreshToken = generateRandomToken();
      const consumed = await this.refreshTokenRepo.consumeToken(
        refreshToken,
        newRefreshToken,
      );
      if (!consumed) {
        throw new UnauthorizedException('刷新令牌无效或已过期');
      }

      // 4. 签发新 access（ver 快照为当前版本）并落库新 refresh 记录（同版本）
      const accessJti = randomUUID();
      const accessToken = this.jwtService.sign(
        { sub: user.id, ver: user.tokenVersion },
        {
          secret: this.accessSecret,
          expiresIn: this.accessExpiresIn,
          jwtid: accessJti,
        },
      );

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
          jti: accessJti,
          expiresAt: newExpiresAt,
          deviceInfo:
            context?.deviceInfo || oldTokenRecord.deviceInfo || undefined,
          deviceId: context?.deviceId || oldTokenRecord.deviceId || undefined,
          userAgent:
            context?.userAgent || oldTokenRecord.userAgent || undefined,
          ip: context?.ip || oldTokenRecord.ip || undefined,
          tokenVersion: user.tokenVersion,
        });
      } catch (error) {
        this.logger.error(
          'Failed to store new refresh token during rotation',
          error,
        );
        throw new InternalServerErrorException('刷新令牌轮换失败');
      }

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn,
        refreshExpiresIn: refreshExpiresInSeconds,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        // Do not log business logic exceptions as system errors
        throw error;
      }
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
