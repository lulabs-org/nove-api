import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { VerificationCodeRepository } from '@/auth/repositories/verification-code.repository';
import { MailService } from '@/mail/services/mail.service';
import { SmsDeliveryError, SmsService } from '@/sms/sms.service';
import { CodeType } from '@/common/enums';
import { VerificationCodeType } from '@prisma/client';
import {
  generateNumericCode,
  isValidEmail,
  isValidCnPhone,
} from '@/common/utils';

@Injectable()
export class OtpService {
  constructor(
    private readonly repo: VerificationCodeRepository,
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
  ) {}

  async sendCode(
    target: string,
    type: CodeType,
    ip: string,
    userAgent?: string,
    countryCode?: string,
  ): Promise<{ success: boolean; message: string }> {
    if (
      type === CodeType.IDENTITY_CONFIRM ||
      type === CodeType.CHANGE_EMAIL ||
      type === CodeType.CHANGE_PHONE
    ) {
      throw new BadRequestException('该验证码用途仅允许在登录后使用');
    }
    return this.sendCodeInternal(target, type, ip, userAgent, countryCode);
  }

  async sendSecurityCode(
    target: string,
    type:
      | CodeType.IDENTITY_CONFIRM
      | CodeType.CHANGE_EMAIL
      | CodeType.CHANGE_PHONE,
    ip: string,
    userAgent?: string,
    countryCode?: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.sendCodeInternal(target, type, ip, userAgent, countryCode);
  }

  private async sendCodeInternal(
    target: string,
    type: CodeType,
    ip: string,
    userAgent?: string,
    countryCode?: string,
  ): Promise<{ success: boolean; message: string }> {
    const isEmail = isValidEmail(target);
    const isPhone = isValidCnPhone(target);

    if (!isEmail && !isPhone) {
      throw new BadRequestException('目标必须是有效的邮箱或手机号');
    }

    await this.checkSendLimit(target, ip);

    const code = generateNumericCode(6);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const codeType = this.convertCodeType(type);

    const verificationCode = await this.repo.createVerificationCode({
      target,
      code,
      type: codeType,
      expiresAt,
      ip,
      userAgent,
    });

    try {
      if (isEmail) {
        await this.sendEmailCode(target, code, type);
      } else {
        await this.sendSmsCode(target, code, type, countryCode);
      }
    } catch (error) {
      await this.repo.deleteVerificationCode(verificationCode.id);
      throw error;
    }

    await this.repo.invalidateActiveCodes(
      target,
      codeType,
      verificationCode.id,
    );
    await this.updateSendLimit(target, ip);

    return {
      success: true,
      message: isEmail ? '验证码已发送到邮箱' : '验证码已发送到手机',
    };
  }

  async verifyCode(
    target: string,
    code: string,
    type: CodeType,
  ): Promise<{ valid: boolean; message: string }> {
    const codeType = this.convertCodeType(type);
    const verificationCode = await this.repo.findLatestActiveCode(
      target,
      codeType,
    );

    if (!verificationCode || verificationCode.attemptCount >= 5) {
      return { valid: false, message: '验证码无效或已过期' };
    }
    if (verificationCode.code !== code) {
      await this.repo.incrementAttemptCount(verificationCode.id);
      return { valid: false, message: '验证码无效或已过期' };
    }

    await this.repo.markVerificationCodeUsed(verificationCode.id);
    return { valid: true, message: '验证码验证成功' };
  }

  async cleanExpiredCodes(): Promise<number> {
    return this.repo.deleteExpiredVerificationCodes(new Date());
  }

  private async checkSendLimit(target: string, ip: string): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const targetCount = await this.repo.countSentToTargetSince(
      target,
      oneHourAgo,
    );
    if (targetCount >= 5) {
      throw new HttpException(
        '发送过于频繁，请1小时后再试',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const ipCount = await this.repo.countSentFromIpSince(ip, oneDayAgo);
    if (ipCount >= 20) {
      throw new HttpException(
        '发送过于频繁，请明天再试',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async updateSendLimit(target: string, ip: string): Promise<void> {
    await this.repo.upsertSendLimit(target, ip, new Date());
  }

  private async sendEmailCode(
    email: string,
    code: string,
    type: CodeType,
  ): Promise<void> {
    const typeMap = {
      [CodeType.REGISTER]: 'register',
      [CodeType.LOGIN]: 'login',
      [CodeType.RESET_PASSWORD]: 'reset_password',
      [CodeType.IDENTITY_CONFIRM]: 'security',
      [CodeType.CHANGE_EMAIL]: 'security',
      [CodeType.CHANGE_PHONE]: 'security',
    } as const;

    await this.mailService.sendVerificationCode(email, code, typeMap[type]);
  }

  private async sendSmsCode(
    phone: string,
    code: string,
    type: CodeType,
    countryCode?: string,
  ): Promise<void> {
    try {
      await this.smsService.sendSms(phone, code, type, countryCode);
    } catch (error) {
      const errorMessage =
        error instanceof SmsDeliveryError
          ? error.message
          : '短信服务暂时不可用，请稍后重试';
      throw new BadRequestException(errorMessage);
    }
  }

  private convertCodeType(type: CodeType): VerificationCodeType {
    const typeMap = {
      [CodeType.REGISTER]: VerificationCodeType.REGISTER,
      [CodeType.LOGIN]: VerificationCodeType.LOGIN,
      [CodeType.RESET_PASSWORD]: VerificationCodeType.RESET_PASSWORD,
      [CodeType.IDENTITY_CONFIRM]: VerificationCodeType.IDENTITY_CONFIRM,
      [CodeType.CHANGE_EMAIL]: VerificationCodeType.CHANGE_EMAIL,
      [CodeType.CHANGE_PHONE]: VerificationCodeType.CHANGE_PHONE,
    } as const;
    return typeMap[type];
  }
}
