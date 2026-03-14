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
import { VerificationService } from '@/verification/verification.service';
import { CodeType } from '@/verification/enums';
import { UserRepository } from '@/user/repositories/user.repository';
import { AuthPolicyService } from './auth-policy.service';
import { MailService } from '@/mail/mail.service';
import { buildPasswordResetNotificationEmail } from '../../common/email-templates';
import { hashPassword, validatePassword } from '@/common/utils/password.util';
import { LoginType } from '@/auth/enums';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly verificationService: VerificationService,
    private readonly authPolicy: AuthPolicyService,
    private readonly mailService: MailService,
  ) {}

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    ip: string,
    userAgent?: string,
  ): Promise<{ success: boolean; message: string }> {
    const { target, code, newPassword } = resetPasswordDto;

    const verifyResult = await this.verificationService.verifyCode(
      target,
      code,
      CodeType.RESET_PASSWORD,
    );
    if (!verifyResult.valid) {
      throw new BadRequestException(verifyResult.message);
    }

    const user = await this.userRepo.findByTarget(target);
    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    validatePassword(newPassword);

    const hashedPassword = await hashPassword(newPassword);
    await this.userRepo.updatePassword(user.id, hashedPassword);

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
    };
  }
}
