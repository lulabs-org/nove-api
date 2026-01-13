/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-01 06:41:28
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-14 01:51:36
 * @FilePath: /nove_api/src/configs/jwt.config.ts
 * @Description: Configuration for JWT token settings
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { registerAs, ConfigType } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret:
    process.env.JWT_SECRET ??
    (() => {
      throw new Error(
        'JWT_SECRET environment variable is required. Please set a strong random secret key (minimum 32 characters).',
      );
    })(),
  accessExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
}));

export type JwtConfig = ConfigType<typeof jwtConfig>;
