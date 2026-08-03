/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-23 06:15:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-01 16:18:23
 * @FilePath: /lulab_backend/src/common/utils/password.util.ts
 * @Description: 密码工具类
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { isStrongPassword } from './validators';

const SALT_ROUNDS = 12;

export function validatePassword(password: string): void {
  if (password.length < 8) {
    throw new BadRequestException('密码长度至少为8位');
  }
  if (!isStrongPassword(password)) {
    throw new BadRequestException('密码必须包含大小写字母和数字');
  }
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
