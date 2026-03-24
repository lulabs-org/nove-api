/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-01 21:54:50
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-02 04:05:29
 * @FilePath: /lulab_backend/src/auth/services/token.service.ts
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

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
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
    this.refreshSecret = this.config.refreshSecret;
    this.accessExpiresIn = this.config.accessExpiresIn;
    this.refreshExpiresIn = this.config.refreshExpiresIn;
  }

  /**
   * 解析时间字符串为毫秒数
   */
  private parseDurationToMs(duration: string): number {
    const m = /^(\d+)(ms|s|m|h|d|w)?$/i.exec(duration.trim());
    if (!m) throw new Error(`Unsupported duration format: ${duration}`);
    const val = Number(m[1]);
    const unit = (m[2] || 's').toLowerCase();
    const unitMap: Record<string, number> = {
      ms: 1,
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
      w: 604_800_000,
    };
    return val * (unitMap[unit] ?? 1000);
  }

  /**
   * 生成令牌并存储刷新令牌到数据库
   */
  async generateTokens(
    userId: string,
    context?: TokenGenerationContext,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = { sub: userId };
    const refreshJti = randomUUID();
    const accessJti = randomUUID();

    const accessToken = this.jwtService.sign(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpiresIn,
      jwtid: accessJti,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiresIn,
      jwtid: refreshJti,
    });

    // 计算刷新令牌过期时间
    let expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // fallback
    try {
      const durationMs = this.parseDurationToMs(this.refreshExpiresIn || '7d');
      expiresAt = new Date(Date.now() + durationMs);
    } catch (err) {
      this.logger.warn(
        `Failed to parse refreshExpiresIn ("${this.refreshExpiresIn}"), using fallback expiry.`,
        err,
      );
    }

    // 存储刷新令牌到数据库
    try {
      await this.refreshTokenRepo.createRefreshToken({
        userId,
        token: refreshToken,
        jti: refreshJti,
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

    return { accessToken, refreshToken };
  }

  async refreshToken(
    refreshToken: string,
    context?: TokenGenerationContext,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // 首先验证JWT的签名和过期时间
      const payload = this.jwtService.verify<{ sub: string; jti?: string }>(
        refreshToken,
        {
          secret: this.refreshSecret,
        },
      );

      if (!payload.jti) {
        throw new UnauthorizedException('刷新令牌格式错误');
      }

      // 检查令牌是否在黑名单中
      const revoked = await this.tokenBlacklist.isTokenBlacklisted(
        payload.jti,
        TokenBlacklistScope.RefreshToken,
      );
      if (revoked) {
        throw new UnauthorizedException('刷新令牌已被撤销');
      }

      // 检查数据库中的令牌是否有效
      const oldTokenRecord = await this.refreshTokenRepo.findByJti(payload.jti);
      if (!oldTokenRecord || oldTokenRecord.revokedAt) {
        throw new UnauthorizedException('刷新令牌无效或已过期');
      }

      // 验证用户是否存在
      const user = await this.userRepo.getUserById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      // 生成新的访问令牌
      const accessToken = this.jwtService.sign(
        { sub: user.id },
        {
          secret: this.accessSecret,
          expiresIn: this.accessExpiresIn,
          jwtid: randomUUID(),
        },
      );

      // 生成新的刷新令牌（令牌轮换）
      const newRefreshJti = randomUUID();
      const newRefreshToken = this.jwtService.sign(
        { sub: user.id },
        {
          secret: this.refreshSecret,
          expiresIn: this.refreshExpiresIn,
          jwtid: newRefreshJti,
        },
      );

      // 计算新的刷新令牌过期时间
      let newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // fallback
      try {
        const durationMs = this.parseDurationToMs(
          this.refreshExpiresIn || '7d',
        );
        newExpiresAt = new Date(Date.now() + durationMs);
      } catch (err) {
        this.logger.warn(
          `Failed to parse refreshExpiresIn ("${this.refreshExpiresIn}"), using fallback expiry.`,
          err,
        );
      }

      // 存储新的刷新令牌到数据库
      try {
        await this.refreshTokenRepo.createRefreshToken({
          userId: user.id,
          token: newRefreshToken,
          jti: newRefreshJti,
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

      // 原子操作：标记旧令牌被替换，防止竞态条件
      // 只有当令牌未被其他请求撤销时才能成功
      try {
        const revokeResult = await this.refreshTokenRepo.atomicRevokeIfNotRevoked(
          payload.jti,
          {
            replacedBy: newRefreshJti,
          },
        );

        if (!revokeResult.success) {
          // 令牌已被其他请求撤销，说明发生了并发刷新
          // 这是正常的竞态条件处理，不抛出错误
          this.logger.warn(
            `Token ${payload.jti} was already revoked by another request (race condition handled)`,
          );
        }
      } catch (error) {
        this.logger.error('Failed to mark old token as replaced', error);
        // 不阻止流程继续，因为新令牌已成功创建
      }

      // 将旧刷新令牌加入黑名单，确保只能使用一次
      try {
        await this.tokenBlacklist.add(
          refreshToken,
          TokenBlacklistScope.RefreshToken,
        );
      } catch (error) {
        this.logger.error('Failed to blacklist old refresh token', error);
        // 不阻止流程继续，因为新令牌已成功创建
      }

      return { accessToken, refreshToken: newRefreshToken };
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
      // 1. 撤销访问令牌（加入黑名单）
      const accessTokenResult = await this.tokenBlacklist.add(
        accessToken,
        TokenBlacklistScope.AccessToken,
      );
      result.accessTokenRevoked = accessTokenResult.added;

      // 2. 处理刷新令牌
      if (options.refreshToken) {
        try {
          // 验证刷新令牌的有效性
          const refreshPayload = this.jwtService.verify<{
            sub: string;
            jti?: string;
          }>(options.refreshToken, {
            secret: this.refreshSecret,
          });

          if (refreshPayload.jti) {
            // 撤销数据库中的刷新令牌
            const revokedToken = await this.refreshTokenRepo.revokeTokenByJti(
              refreshPayload.jti,
            );
            result.refreshTokenRevoked = !!revokedToken;

            // 同时将刷新令牌加入黑名单
            await this.tokenBlacklist.add(
              options.refreshToken,
              TokenBlacklistScope.RefreshToken,
            );
          }
        } catch (error) {
          this.logger.warn('Failed to verify/revoke refresh token', error);
          // 尽力撤销，即使验证失败也要尝试撤销
          try {
            await this.refreshTokenRepo.revokeToken(options.refreshToken);
            await this.tokenBlacklist.add(
              options.refreshToken,
              TokenBlacklistScope.RefreshToken,
            );
            result.refreshTokenRevoked = true;
          } catch {
            // 忽略错误
          }
        }
      }

      // 3. 根据选项撤销刷新令牌
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

      // 4. 生成成功消息
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
