/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-09-04 18:40:00
 * @Description: Auth 领域业务异常体系定义
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import {
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

// ==========================================
// 1. Token 与会话相关异常 (Tokens & Sessions)
// ==========================================

/**
 * 刷新令牌无效或已过期
 */
export class InvalidRefreshTokenException extends UnauthorizedException {
  constructor(message: string = '刷新令牌无效或已过期') {
    super(message);
  }
}

/**
 * 缺失刷新令牌
 */
export class MissingRefreshTokenException extends UnauthorizedException {
  constructor(message: string = '刷新令牌不能为空') {
    super(message);
  }
}

/**
 * 缺失访问令牌
 */
export class MissingAccessTokenException extends UnauthorizedException {
  constructor(message: string = '未找到访问令牌') {
    super(message);
  }
}

/**
 * 访问令牌已被撤销
 */
export class TokenRevokedException extends UnauthorizedException {
  constructor(message: string = '访问令牌已撤销') {
    super(message);
  }
}

/**
 * 登录凭证失效（如用户密码已变更或强制踢出）
 */
export class SessionInvalidException extends UnauthorizedException {
  constructor(message: string = '登录凭证已失效，请重新登录') {
    super(message);
  }
}

/**
 * 会话未找到
 */
export class SessionNotFoundException extends NotFoundException {
  constructor(message: string = '会话不存在') {
    super(message);
  }
}

/**
 * 当前会话禁止通过会话吊销直接注销（需走 logout）
 */
export class CannotRevokeCurrentSessionException extends BadRequestException {
  constructor(message: string = '当前会话请使用退出登录功能') {
    super(message);
  }
}

/**
 * 生成刷新令牌失败（服务端内部错误）
 */
export class TokenGenerationFailedException extends InternalServerErrorException {
  constructor(message: string = '生成刷新令牌失败') {
    super(message);
  }
}

/**
 * 刷新令牌轮换失败（服务端内部错误）
 */
export class TokenRotationFailedException extends InternalServerErrorException {
  constructor(message: string = '刷新令牌轮换失败') {
    super(message);
  }
}

// ==========================================
// 2. 身份凭证与账户状态相关异常 (Credentials & Identity)
// ==========================================

/**
 * 用户名或密码错误
 */
export class InvalidCredentialsException extends UnauthorizedException {
  constructor(message: string = '用户名或密码错误') {
    super(message);
  }
}

/**
 * 账户已被禁用
 */
export class AccountDisabledException extends UnauthorizedException {
  constructor(message: string = '账户已被禁用') {
    super(message);
  }
}

/**
 * 账户已被删除
 */
export class AccountDeletedException extends UnauthorizedException {
  constructor(message: string = '账户已被删除') {
    super(message);
  }
}

/**
 * 账户被锁定（多次输入密码错误防爆破锁定）
 */
export class AccountLockedException extends HttpException {
  constructor(message: string = '登录失败次数过多，请稍后再试') {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

/**
 * 缺少登录/注册目标（如未提供用户名、邮箱或手机号）
 */
export class MissingIdentityTargetException extends BadRequestException {
  constructor(message: string = '请提供用户名、邮箱或手机号') {
    super(message);
  }
}

/**
 * 鉴权或凭证流中找不到用户 (401)
 */
export class AuthUserNotFoundException extends UnauthorizedException {
  constructor(message: string = '用户不存在') {
    super(message);
  }
}

/**
 * 找回密码时找不到用户 (400)
 */
export class ResetPasswordUserNotFoundException extends BadRequestException {
  constructor(message: string = '用户不存在') {
    super(message);
  }
}

/**
 * 资源或实体找不到用户 (404)
 */
export class UserNotFoundException extends NotFoundException {
  constructor(message: string = '用户不存在') {
    super(message);
  }
}

/**
 * 控制器中找不到当前认证上下文用户 (401)
 */
export class MissingAuthUserException extends UnauthorizedException {
  constructor(message: string = '未找到当前用户信息') {
    super(message);
  }
}

// ==========================================
// 3. 注册相关异常 (Registration)
// ==========================================

/**
 * 无效的注册方式
 */
export class InvalidRegistrationTypeException extends BadRequestException {
  constructor(message: string = '无效的注册方式') {
    super(message);
  }
}

/**
 * 不支持的注册方式
 */
export class UnsupportedRegistrationTypeException extends BadRequestException {
  constructor(message: string = '不支持的注册方式') {
    super(message);
  }
}

/**
 * 注册凭证缺失（如邮箱密码不能为空等）
 */
export class MissingRegistrationCredentialsException extends BadRequestException {
  constructor(message: string = '注册凭证不能为空') {
    super(message);
  }
}

/**
 * 用户名已被注册
 */
export class UsernameAlreadyExistsException extends BadRequestException {
  constructor(message: string = '用户名已被注册') {
    super(message);
  }
}

/**
 * 邮箱已被注册
 */
export class EmailAlreadyExistsException extends BadRequestException {
  constructor(message: string = '邮箱已被注册') {
    super(message);
  }
}

/**
 * 手机号已被注册
 */
export class PhoneAlreadyExistsException extends BadRequestException {
  constructor(message: string = '手机号已被注册') {
    super(message);
  }
}

// ==========================================
// 4. 账号安全相关异常 (Account Security)
// ==========================================

/**
 * 当前账号未绑定/未验证邮箱
 */
export class NoVerifiedEmailException extends BadRequestException {
  constructor(message: string = '当前账号没有已验证邮箱') {
    super(message);
  }
}

/**
 * 当前账号未绑定/未验证手机号
 */
export class NoVerifiedPhoneException extends BadRequestException {
  constructor(message: string = '当前账号没有已验证手机号') {
    super(message);
  }
}

/**
 * 新邮箱与当前邮箱相同
 */
export class SameEmailException extends BadRequestException {
  constructor(message: string = '新邮箱不能与当前邮箱相同') {
    super(message);
  }
}

/**
 * 邮箱已被其他账号占用
 */
export class EmailAlreadyInUseException extends ConflictException {
  constructor(message: string = '邮箱已被使用') {
    super(message);
  }
}

/**
 * 新手机号与当前手机号相同
 */
export class SamePhoneException extends BadRequestException {
  constructor(message: string = '新手机号不能与当前手机号相同') {
    super(message);
  }
}

/**
 * 手机号已被其他账号占用
 */
export class PhoneAlreadyInUseException extends ConflictException {
  constructor(message: string = '手机号已被使用') {
    super(message);
  }
}

/**
 * 联系方式已发生变化（并发修改冲突）
 */
export class ContactInfoChangedException extends ConflictException {
  constructor(message: string = '联系方式已发生变化，请刷新后重试') {
    super(message);
  }
}

/**
 * 当前密码不正确
 */
export class CurrentPasswordIncorrectException extends BadRequestException {
  constructor(message: string = '当前密码不正确') {
    super(message);
  }
}

/**
 * 新密码不能与当前密码相同
 */
export class SamePasswordException extends BadRequestException {
  constructor(message: string = '新密码不能与当前密码相同') {
    super(message);
  }
}

/**
 * 当前密码未设置
 */
export class PasswordNotSetException extends BadRequestException {
  constructor(message: string = '当前密码未设置，请使用验证码确认身份') {
    super(message);
  }
}

/**
 * 身份确认参数无效
 */
export class InvalidIdentityConfirmationException extends BadRequestException {
  constructor(message: string = '请仅提供当前密码或验证码进行身份确认') {
    super(message);
  }
}

// ==========================================
// 5. 验证码相关异常 (OTP / Verification)
// ==========================================

/**
 * 验证码目标无效（必须是有效邮箱或手机号）
 */
export class InvalidVerificationTargetException extends BadRequestException {
  constructor(message: string = '目标必须是有效的邮箱或手机号') {
    super(message);
  }
}

/**
 * 验证码使用范围限制（仅允许登录后使用）
 */
export class VerificationCodeScopeException extends BadRequestException {
  constructor(message: string = '该验证码用途仅允许在登录后使用') {
    super(message);
  }
}

/**
 * 验证码无效或已过期
 */
export class VerificationCodeInvalidOrExpiredException extends BadRequestException {
  constructor(message: string = '验证码无效或已过期') {
    super(message);
  }
}

/**
 * 验证码已被使用
 */
export class VerificationCodeAlreadyUsedException extends BadRequestException {
  constructor(message: string = '验证码已被使用，请重新获取') {
    super(message);
  }
}

/**
 * 验证码发送过于频繁（限流）
 */
export class OtpRateLimitException extends HttpException {
  constructor(message: string = '发送过于频繁，请稍后再试') {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}
