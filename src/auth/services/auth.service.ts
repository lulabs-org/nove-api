/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-09-04 18:00:00
 * @Description: 认证核心业务服务 (Unified Auth Service)
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserQueryRepository } from '@/user/repositories/user-query.repository';
import { UserCommandRepository } from '@/user/repositories/user-command.repository';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { LoginLogRepository } from '../repositories/login-log.repository';
import { AuthMailService } from '@/mail/services/auth-mail.service';
import { PermService } from '@/admin/permission/services/permission.service';
import { UserOrgService } from '@/admin/api-key/services/user-organization.service';
import { AuthType, LoginType } from '@/auth/enums';
import { CodeType } from '@/common/enums';
import { hashPassword, validatePassword } from '@/common/utils/password.util';
import { formatAuthUserResponse } from '@/auth/utils/auth-user-mapper';
import { LogoutOptions, LogoutResult } from '@/auth/types';
import {
  RegisterDto,
  LoginDto,
  ResetPasswordDto,
  RefreshTokenDto,
  AuthResponseDto,
} from '@/auth/dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly maxLoginAttempts = 5;
  private readonly lockoutDuration = 15 * 60 * 1000; // 15分钟

  constructor(
    private readonly userQueryRepo: UserQueryRepository,
    private readonly userCommandRepo: UserCommandRepository,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
    private readonly loginLogRepo: LoginLogRepository,
    private readonly authMailService: AuthMailService,
    private readonly permService: PermService,
    private readonly userOrgService: UserOrgService,
  ) {}

  /**
   * 用户注册并自动补全当前组织 ID
   */
  async register(
    registerDto: RegisterDto,
    ip: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const { type, username, email, phone, password, code, countryCode } =
      registerDto;

    this.validateRegisterType(type, registerDto);
    await this.checkUserExists(username, email, phone, countryCode);

    if (type === AuthType.EMAIL_CODE || type === AuthType.PHONE_CODE) {
      const target = type === AuthType.EMAIL_CODE ? email : phone;
      const verifyResult = await this.otpService.verifyCode(
        target!,
        code!,
        CodeType.REGISTER,
      );
      if (!verifyResult.valid) {
        throw new BadRequestException(verifyResult.message);
      }
    } else {
      throw new BadRequestException('无效的注册方式');
    }

    const hashedPassword = password ? await hashPassword(password) : null;
    const now = new Date();

    const user = await this.userCommandRepo.createWithProfile({
      username,
      email: email || null,
      phone,
      countryCode,
      password: hashedPassword,
      emailVerifiedAt: type === AuthType.EMAIL_CODE ? now : null,
      phoneVerifiedAt: type === AuthType.PHONE_CODE ? now : null,
      profileName: username || email?.split('@')[0] || phone || '用户',
    });

    await this.createLoginLog({
      userId: user.id,
      target: email || phone || username!,
      loginType: this.getLoginType(type),
      success: true,
      ip,
      userAgent,
    });

    if (email) {
      try {
        await this.authMailService.sendWelcomeEmail(email, username || 'User');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(`发送欢迎邮件失败: ${errorMessage}`);
      }
    }

    const tokens = await this.tokenService.generateTokens(user.id, {
      ip,
      userAgent,
      deviceInfo: registerDto.deviceInfo,
      deviceId: registerDto.deviceId,
    });

    const currentOrgId = await this.resolveCurrentOrgId(user.id);

    return {
      user: {
        ...formatAuthUserResponse(user),
        currentOrgId,
      },
      ...tokens,
    };
  }

  /**
   * 用户登录并自动补全当前组织 ID
   */
  async login(
    loginDto: LoginDto,
    ip: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const { type, username, email, phone, countryCode, password, code } =
      loginDto;
    const target = username || email || phone;

    if (!target) {
      throw new BadRequestException('请提供用户名、邮箱或手机号');
    }

    await this.checkLoginLockout(target, ip);

    const user = await this.findUserByTarget(target, countryCode);
    if (!user) {
      await this.createLoginLog({
        userId: null,
        target,
        loginType: this.getLoginType(type),
        success: false,
        ip,
        userAgent,
        failReason: '用户不存在',
      });
      throw new UnauthorizedException('用户名或密码错误');
    }

    let failureReason = '';

    try {
      if (type === AuthType.EMAIL_CODE || type === AuthType.PHONE_CODE) {
        const verifyResult = await this.otpService.verifyCode(
          target,
          code!,
          CodeType.LOGIN,
        );
        if (!verifyResult.valid) {
          failureReason = verifyResult.message;
          throw new UnauthorizedException(verifyResult.message);
        }
      } else {
        if (!user.passwordHash) {
          failureReason = '该账户未设置密码，请使用验证码登录';
          throw new UnauthorizedException(failureReason);
        }
        const isPasswordValid = await bcrypt.compare(
          password!,
          user.passwordHash,
        );
        if (!isPasswordValid) {
          failureReason = '密码错误';
          throw new UnauthorizedException('用户名或密码错误');
        }
      }

      await this.userCommandRepo.updateLastLogin(user.id, new Date());

      await this.createLoginLog({
        userId: user.id,
        target,
        loginType: this.getLoginType(type),
        success: true,
        ip,
        userAgent,
      });

      const tokens = await this.tokenService.generateTokens(user.id, {
        ip,
        userAgent,
        deviceInfo: loginDto.deviceInfo,
        deviceId: loginDto.deviceId,
      });

      const currentOrgId = await this.resolveCurrentOrgId(user.id);

      return {
        user: {
          ...formatAuthUserResponse(user),
          currentOrgId,
        },
        ...tokens,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.createLoginLog({
        userId: user.id,
        target,
        loginType: this.getLoginType(type),
        success: false,
        ip,
        userAgent,
        failReason: failureReason || errorMessage,
      });
      throw error;
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    ip: string,
    userAgent?: string,
  ): Promise<{ success: boolean; message: string }> {
    const { target, code, newPassword } = resetPasswordDto;

    const verifyResult = await this.otpService.verifyCode(
      target,
      code,
      CodeType.RESET_PASSWORD,
    );
    if (!verifyResult.valid) {
      throw new BadRequestException(verifyResult.message);
    }

    const user = await this.userQueryRepo.byTarget(target);
    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    validatePassword(newPassword);

    const hashedPassword = await hashPassword(newPassword);
    await this.userCommandRepo.updatePassword(user.id, hashedPassword);

    await this.createLoginLog({
      userId: user.id,
      target,
      loginType: LoginType.PASSWORD_RESET,
      success: true,
      ip,
      userAgent,
    });

    if (user.email) {
      try {
        const displayName =
          typeof user.profile === 'object' &&
          user.profile &&
          'name' in user.profile
            ? (user.profile as { name?: string }).name || 'User'
            : 'User';

        await this.authMailService.sendPasswordResetNotification(
          user.email,
          displayName,
          new Date(),
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(`发送密码重置通知邮件失败: ${errorMessage}`);
      }
    }

    return {
      success: true,
      message: '密码重置成功',
    };
  }

  /**
   * 刷新 Token
   */
  async refreshToken(
    refreshToken: string,
    dto: RefreshTokenDto,
    ip: string,
    userAgent?: string,
  ) {
    return this.tokenService.refreshToken(refreshToken, {
      ip,
      userAgent,
      deviceInfo: dto.deviceInfo,
      deviceId: dto.deviceId,
    });
  }

  /**
   * 登出流程（含结构化日志）
   */
  async logout(
    userId: string,
    accessToken: string,
    options: LogoutOptions = {},
  ): Promise<LogoutResult> {
    const result = await this.tokenService.logout(userId, accessToken, options);

    this.logger.log(
      `User ${userId} logout: ${JSON.stringify({
        accessRevoked: result.accessTokenRevoked,
        refreshRevoked: result.refreshTokenRevoked,
        allDevices: result.allDevicesLoggedOut,
        revokedCount: result.revokedTokensCount,
        ip: options.ip,
        userAgent: options.userAgent,
      })}`,
    );

    return result;
  }

  /**
   * 根据角色解析权限代码列表
   */
  async getPermissionsByRoles(roles: string[] = ['USER']): Promise<string[]> {
    try {
      return await this.permService.getPermByRoleCodes(roles);
    } catch (error) {
      this.logger.warn(
        `Failed to resolve permissions for roles ${roles.join(',')}: ${error}`,
      );
      return [];
    }
  }

  /**
   * 解析当前用户的默认/主组织 ID
   */
  async resolveCurrentOrgId(userId: string): Promise<string | undefined> {
    try {
      return await this.userOrgService.getPrimaryOrgId(userId);
    } catch {
      return undefined;
    }
  }

  // --- 内部辅助方法 ---

  private async checkLoginLockout(target: string, ip: string): Promise<void> {
    const since = new Date(Date.now() - this.lockoutDuration);

    const targetFailures =
      await this.loginLogRepo.countLoginFailuresByTargetSince(target, since);
    const ipFailures = await this.loginLogRepo.countLoginFailuresByIpSince(
      ip,
      since,
    );

    if (targetFailures >= this.maxLoginAttempts) {
      throw new HttpException(
        `登录失败次数过多，请${this.lockoutDuration / 60000}分钟后再试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (ipFailures >= this.maxLoginAttempts * 2) {
      throw new HttpException(
        `该IP登录失败次数过多，请${this.lockoutDuration / 60000}分钟后再试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private getLoginType(authType: AuthType): LoginType {
    const typeMap = {
      [AuthType.USERNAME_PASSWORD]: LoginType.USERNAME_PASSWORD,
      [AuthType.EMAIL_PASSWORD]: LoginType.EMAIL_PASSWORD,
      [AuthType.EMAIL_CODE]: LoginType.EMAIL_CODE,
      [AuthType.PHONE_PASSWORD]: LoginType.PHONE_PASSWORD,
      [AuthType.PHONE_CODE]: LoginType.PHONE_CODE,
    } as const;
    return typeMap[authType] || LoginType.USERNAME_PASSWORD;
  }

  private async createLoginLog(params: {
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

  private async findUserByTarget(target: string, countryCode?: string) {
    return await this.userQueryRepo.byTarget(target, countryCode);
  }

  private validateRegisterType(type: AuthType, registerDto: RegisterDto): void {
    const { email, phone, password, code } = registerDto;

    switch (type) {
      case AuthType.USERNAME_PASSWORD:
        throw new BadRequestException(
          '为了账户安全，注册需要邮箱或手机号验证，请使用邮箱验证码或手机验证码注册',
        );
      case AuthType.EMAIL_PASSWORD:
        if (!email || !password) {
          throw new BadRequestException('邮箱和密码不能为空');
        }
        validatePassword(password);
        throw new BadRequestException(
          '为了账户安全，请先通过邮箱验证码验证您的邮箱地址',
        );
      case AuthType.EMAIL_CODE:
        if (!email || !code) {
          throw new BadRequestException('邮箱和验证码不能为空');
        }
        break;
      case AuthType.PHONE_PASSWORD:
        if (!phone || !password) {
          throw new BadRequestException('手机号和密码不能为空');
        }
        validatePassword(password);
        throw new BadRequestException(
          '为了账户安全，请先通过手机验证码验证您的手机号码',
        );
      case AuthType.PHONE_CODE:
        if (!phone || !code) {
          throw new BadRequestException('手机号和验证码不能为空');
        }
        break;
      default:
        throw new BadRequestException('不支持的注册方式');
    }
  }

  private async checkUserExists(
    username?: string,
    email?: string,
    phone?: string,
    countryCode?: string,
  ): Promise<void> {
    const conditions: Array<Record<string, unknown>> = [];
    if (username) conditions.push({ username });
    if (email) conditions.push({ email });
    if (phone && countryCode)
      conditions.push({ unique_phone_combination: { countryCode, phone } });

    if (conditions.length === 0) return;

    const existingUser = await this.userQueryRepo.first(conditions);

    if (existingUser) {
      if (username && existingUser.username === username) {
        throw new BadRequestException('用户名已被注册');
      }
      if (email && existingUser.email === email) {
        throw new BadRequestException('邮箱已被注册');
      }
      if (
        phone &&
        countryCode &&
        existingUser.phone === phone &&
        existingUser.countryCode === countryCode
      ) {
        throw new BadRequestException('手机号已被注册');
      }
    }
  }
}
