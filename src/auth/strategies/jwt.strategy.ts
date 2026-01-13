/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-23 06:15:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-01 19:26:58
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
import type { ConfigType } from '@nestjs/config';
import {
  JWT_USER_LOOKUP,
  type JwtUserLookup,
  type JwtPayload,
  type AuthenticatedUser,
  TokenBlacklistScope,
} from '@/auth/types/jwt.types';
import { jwtConfig } from '@/configs/jwt.config';
import { TokenBlacklistService } from '@/auth/services/token-blacklist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
    @Inject(JWT_USER_LOOKUP)
    private readonly userLookup: JwtUserLookup,
    @Optional()
    private readonly blacklist?: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.accessSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
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

export { JWT_USER_LOOKUP };
