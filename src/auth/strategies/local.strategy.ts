/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-14 03:00:32
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-14 03:01:11
 * @FilePath: /nove_api/src/auth/strategies/local.strategy.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '@/user/repositories/user.repository';
import type { User } from '@prisma/client';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userRepo: UserRepository) {
    super({
      usernameField: 'username',
      passwordField: 'password',
    });
  }

  async validate(username: string, password: string): Promise<User> {
    const user = await this.userRepo.findUserByTarget(username);

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('该账户未设置密码，请使用验证码登录');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (!user.active) {
      throw new UnauthorizedException('账户已被禁用');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('账户已被删除');
    }

    return user;
  }
}
