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

    // 用户级令牌失效边界：token 签发时快照的 ver 必须与用户当前 tokenVersion 一致。
    // 密码重置/修改会原子递增 tokenVersion，因此所有历史签发的 access token（包括
    // refresh rotation 前的旧 token、以及未持久化 jti 的存量 token）都会立即失效。
    // 缺失 ver 的存量 token 按 0 处理，部署后仍可正常使用，直至下次密码变更。
    const tokenVer = payload.ver ?? 0;
    if (tokenVer !== authUser.tokenVersion) {
      throw new UnauthorizedException('访问令牌已失效，请重新登录');
    }

    // 如果 JWT 中带有 scope 权限范围（OAuth 2.0 场景），则将其附加到 authUser 上
    if (payload.scopes) {
      authUser.scopes = payload.scopes;
    }

    return authUser;
  }
}
