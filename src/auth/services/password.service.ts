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
import { ResetPasswordDto } from '../dto';
import { OtpService } from '@/auth/services/otp.service';
import { CodeType } from '@/common/enums';
import { UserQueryRepository } from '@/user/repositories/user-query.repository';
import { UserCommandRepository } from '@/user/repositories/user-command.repository';
import { AuthPolicyService } from './auth-policy.service';
import { AuthMailService } from '@/mail/services/auth-mail.service';
import { hashPassword, validatePassword } from '@/common/utils/password.util';
import { LoginType } from '@/auth/enums';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  constructor(
    private readonly userQueryRepo: UserQueryRepository,
    private readonly userCommandRepo: UserCommandRepository,
    private readonly otpService: OtpService,
    private readonly authPolicy: AuthPolicyService,
    private readonly authMailService: AuthMailService,
  ) {}

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
}
