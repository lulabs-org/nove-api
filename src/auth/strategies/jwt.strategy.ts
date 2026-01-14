/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-23 06:15:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-14 10:29:14
 * @FilePath: /lulab_backend/src/auth/strategies/jwt.strategy.ts
 * @Description: JWT 策略，用于验证和解析 JWT 令牌
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import {
  Injectable,
  Inject,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  JWT_USER_LOOKUP,
  JWT_TOKEN_BLACKLIST,
  type JwtUserLookup,
  type JwtTokenBlacklist,
  type JwtPayload,
  type AuthenticatedUser,
  TokenBlacklistScope,
} from '@/auth/types/jwt.types';
import { jwtConfig } from '@/configs/jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly cfg: ReturnType<typeof jwtConfig>,
    @Inject(JWT_USER_LOOKUP)
    private readonly userLookup: JwtUserLookup,
    @Optional()
    @Inject(JWT_TOKEN_BLACKLIST)
    private readonly blacklist?: JwtTokenBlacklist,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.accessSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Optional token blacklist check (if provided by the app layer)
    if (payload?.jti && this.blacklist) {
      const revoked = await this.blacklist.isTokenBlacklisted(
        payload.jti,
        TokenBlacklistScope.AccessToken,
      );
      if (revoked) {
        throw new UnauthorizedException('访问令牌已撤销');
      }
    }
    const authUser = await this.userLookup.getAuthenticatedUserById(
      payload.sub,
    );
    if (!authUser) {
      throw new UnauthorizedException('用户不存在');
    }
    return authUser;
  }
}
