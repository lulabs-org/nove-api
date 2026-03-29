/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29 19:53:38
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-29 19:53:39
 * @FilePath: /nove_api/src/user-platform/exceptions/platform-user.exceptions.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { HttpException, HttpStatus } from '@nestjs/common';

export class PlatformUserException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(message, status);
  }
}

export class PlatformUserNotFoundException extends PlatformUserException {
  constructor(id?: string) {
    const message = id ? `平台用户未找到: ${id}` : '平台用户未找到';
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class PlatformUserAlreadyExistsException extends PlatformUserException {
  constructor(platform: string, ptUnionId: string) {
    super(
      `平台用户已存在: 平台=${platform}, 联合ID=${ptUnionId}`,
      HttpStatus.CONFLICT,
    );
  }
}

export class PlatformUserValidationException extends PlatformUserException {
  constructor(field: string, value: any, requirement: string) {
    super(
      `平台用户参数验证失败: ${field}=${value}, 要求: ${requirement}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class PlatformUserInactiveException extends PlatformUserException {
  constructor(id: string) {
    super(`平台用户未激活: ${id}`, HttpStatus.FORBIDDEN);
  }
}

export class PlatformUserBindingException extends PlatformUserException {
  constructor(platformUserId: string, localUserId: string) {
    super(
      `平台用户绑定失败: 平台用户ID=${platformUserId}, 本地用户ID=${localUserId}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
