/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-28 11:37:14
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-14 02:40:43
 * @FilePath: /nove_api/src/auth/services/auth-policy.service.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { LoginLogRepository } from '../repositories/login-log.repository';
import { LoginType, AuthType } from '@/auth/enums';

@Injectable()
export class AuthPolicyService {
  private readonly maxLoginAttempts = 5;
  private readonly lockoutDuration = 15 * 60 * 1000;
  private readonly lockoutMinutes = this.lockoutDuration / 60000;

  constructor(private readonly loginLogRepo: LoginLogRepository) {}

  async checkLoginLockout(target: string, ip: string): Promise<void> {
    const since = new Date(Date.now() - this.lockoutDuration);

    const targetFailures =
      await this.loginLogRepo.countLoginFailuresByTargetSince(target, since);
    const ipFailures = await this.loginLogRepo.countLoginFailuresByIpSince(
      ip,
      since,
    );

    if (targetFailures >= this.maxLoginAttempts) {
      throw new HttpException(
        `登录失败次数过多，请${this.lockoutMinutes}分钟后再试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (ipFailures >= this.maxLoginAttempts * 2) {
      throw new HttpException(
        `该IP登录失败次数过多，请${this.lockoutMinutes}分钟后再试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  getLoginType(authType: AuthType): LoginType {
    const typeMap = {
      [AuthType.USERNAME_PASSWORD]: LoginType.USERNAME_PASSWORD,
      [AuthType.EMAIL_PASSWORD]: LoginType.EMAIL_PASSWORD,
      [AuthType.EMAIL_CODE]: LoginType.EMAIL_CODE,
      [AuthType.PHONE_PASSWORD]: LoginType.PHONE_PASSWORD,
      [AuthType.PHONE_CODE]: LoginType.PHONE_CODE,
    } as const;
    return typeMap[authType] || LoginType.USERNAME_PASSWORD;
  }

  async createLoginLog(params: {
    userId: string | null;
    target: string;
    loginType: LoginType;
    success: boolean;
    ip: string;
    userAgent?: string;
    failReason?: string;
  }): Promise<void> {
    await this.loginLogRepo.createLoginLog(params);
  }
}
