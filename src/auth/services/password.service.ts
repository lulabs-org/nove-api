/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-02 21:14:03
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-03 04:04:19
 * @FilePath: /lulab_backend/src/auth/services/password.service.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ResetPasswordResponseDto } from '../dto/reset-password-response.dto';
import { VerificationService } from '@/verification/verification.service';
import { CodeType } from '@/verification/enums';
import { UserQueryRepository } from '@/user/repositories/user-query.repository';
import { UserCommandRepository } from '@/user/repositories/user-command.repository';
import { AuthPolicyService } from './auth-policy.service';
import { TokenService } from './token.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { TokenBlacklistScope } from '@/auth/types/jwt.types';
import { MailService } from '@/mail/services/mail.service';
import { buildPasswordResetNotificationEmail } from '../../common/email-templates';
import { hashPassword, validatePassword } from '@/common/utils/password.util';
import { LoginType } from '@/auth/enums';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  constructor(
    private readonly userQueryRepo: UserQueryRepository,
    private readonly userCommandRepo: UserCommandRepository,
    private readonly verificationService: VerificationService,
    private readonly authPolicy: AuthPolicyService,
    private readonly mailService: MailService,
    private readonly tokenService: TokenService,
    private readonly refreshTokenRepo: RefreshTokenRepository,
    private readonly tokenBlacklist: TokenBlacklistService,
  ) {}

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    ip: string,
    userAgent?: string,
  ): Promise<ResetPasswordResponseDto> {
    const { target, code, newPassword } = resetPasswordDto;

    const verifyResult = await this.verificationService.verifyCode(
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

    // 查出所有活跃 access token 的 jti，批量拉黑（立即踢掉其他设备的 access token）
    // 先执行 Redis 拉黑与 refresh token 撤销，再更新密码：若 Redis 不可用则直接失败，
    // 密码尚未变更，用户可用原密码重试，避免出现"密码已改但旧会话未吊销"的不一致状态。
    const activeJtis = await this.refreshTokenRepo.findActiveJtisByUserId(
      user.id,
    );
    const accessTtlSec = this.tokenService.accessTokenTtlSec;
    if (activeJtis.length > 0) {
      await Promise.all(
        activeJtis.map((jti) =>
          this.tokenBlacklist.addJti(
            jti,
            accessTtlSec,
            TokenBlacklistScope.AccessToken,
          ),
        ),
      );
    }

    // 吊销该用户所有现有 refresh token（踢掉其他设备 + 本设备旧 token）
    await this.refreshTokenRepo.revokeAllTokensByUserId(user.id);

    // Redis 黑名单与 refresh token 撤销成功后再更新密码
    await this.userCommandRepo.updatePassword(user.id, hashedPassword);

    // 为本设备签发新 token，实现无缝续会话
    const tokens = await this.tokenService.generateTokens(user.id, {
      ip,
      userAgent,
    });

    await this.authPolicy.createLoginLog({
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

        const { subject, html } = buildPasswordResetNotificationEmail(
          displayName,
          new Date(),
        );

        await this.mailService.sendSimpleEmail({
          to: user.email,
          subject,
          html,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(`发送密码重置通知邮件失败: ${errorMessage}`);
      }
    }

    return {
      success: true,
      message: '密码重置成功',
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      refreshToken: tokens.refreshToken,
      refreshExpiresIn: tokens.refreshExpiresIn,
    };
  }
}
