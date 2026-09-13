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

import { Injectable, Inject, Optional } from '@nestjs/common';
import {
  TokenRevokedException,
  SessionInvalidException,
  AuthUserNotFoundException,
} from '../exceptions';
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
        throw new TokenRevokedException();
      }
    }

    // 用户级撤销检查：全端登出/密码重置后，撤销时间点之前签发的
    // 所有 access token 立即失效，而非等待其自然过期
    if (
      this.blacklist?.isUserRevokedBefore &&
      typeof payload?.iat === 'number'
    ) {
      const revoked = await this.blacklist.isUserRevokedBefore(
        payload.sub,
        payload.iat,
      );
      if (revoked) {
        throw new SessionInvalidException();
      }
    }

    const authUser = await this.userLookup.getAuthenticatedUserById(
      payload.sub,
    );
    if (!authUser) {
      throw new AuthUserNotFoundException();
    }

    // 如果 JWT 中带有 scope 权限范围（OAuth 2.0 场景），则将其附加到 authUser 上
    if (payload.scopes) {
      authUser.scopes = payload.scopes;
    }
    if (payload.token_use === 'oauth_access') {
      authUser.tokenUse = payload.token_use;
      authUser.clientId = payload.client_id;
      authUser.organizationId = payload.org_id;
      authUser.credentialVersion = payload.credential_version ?? 1;
    }

    return authUser;
  }
}
