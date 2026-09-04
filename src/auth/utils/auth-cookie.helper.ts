/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-09-04 16:00:00
 * @Description: 认证 Cookie 统一管理助手
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { CookieOptions, Response } from 'express';

export class AuthCookieHelper {
  private static readonly REFRESH_TOKEN_COOKIE = 'refreshToken';

  private static get baseOptions(): CookieOptions {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    };
  }

  /**
   * 向响应中写入 RefreshToken Cookie
   */
  static setRefreshToken(
    res: Response,
    token: string,
    maxAgeInSeconds = 0,
  ): void {
    res.cookie(this.REFRESH_TOKEN_COOKIE, token, {
      ...this.baseOptions,
      maxAge: (maxAgeInSeconds || 0) * 1000,
    });
  }

  /**
   * 从响应中清除 RefreshToken Cookie
   */
  static clearRefreshToken(res: Response): void {
    res.clearCookie(this.REFRESH_TOKEN_COOKIE, this.baseOptions);
  }
}
