import {
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';

/**
 * API Key 未找到异常
 */
export class ApiKeyNotFoundException extends NotFoundException {
  constructor(message: string = 'API Key not found') {
    super(message);
  }
}

/**
 * API Key 无效异常
 */
export class ApiKeyInvalidException extends UnauthorizedException {
  constructor(message: string = 'Invalid API key') {
    super(message);
  }
}

/**
 * API Key 已过期异常
 */
export class ApiKeyExpiredException extends UnauthorizedException {
  constructor(message: string = 'API key has expired') {
    super(message);
  }
}

/**
 * API Key 已撤销异常
 */
export class ApiKeyRevokedException extends UnauthorizedException {
  constructor(message: string = 'API key has been revoked') {
    super(message);
  }
}

/**
 * 权限范围不足异常
 */
export class InsufficientScopesException extends ForbiddenException {
  constructor(message: string = 'Insufficient scopes') {
    super(message);
  }
}
