import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { VerificationRepository } from './repositories/verification.repository';
import { MailService } from '@/mail/mail.service';
import { AliyunSmsService } from '../integrations/aliyun/aliyun-sms.service';
import { CodeType } from '@/verification/enums';
import { VerificationCodeType } from '@prisma/client';
import {
  generateNumericCode,
  isValidEmail,
  isValidCnPhone,
} from '../common/utils';

@Injectable()
export class VerificationService {
  constructor(
    private readonly repo: VerificationRepository,
    private readonly mailService: MailService,
    private readonly aliyunSmsService: AliyunSmsService,
  ) {}

  async sendCode(
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

    await this.repo.createVerificationCode({
      target,
      code,
      type: codeType,
      expiresAt,
      ip,
      userAgent,
    });

    if (isEmail) {
      await this.sendEmailCode(target, code, type);
    } else {
      await this.sendSmsCode(target, code, type, countryCode);
    }

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

    // 使用原子操作验证并标记验证码，防止重放攻击
    const verificationCode = await this.repo.verifyAndMarkCodeUsed(
      target,
      code,
      codeType,
    );

    if (!verificationCode) {
      return { valid: false, message: '验证码无效或已过期' };
    }

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
      await this.aliyunSmsService.sendSms(phone, code, type, countryCode);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`短信发送失败: ${errorMessage}`);
    }
  }

  private convertCodeType(type: CodeType): VerificationCodeType {
    const typeMap = {
      [CodeType.REGISTER]: VerificationCodeType.REGISTER,
      [CodeType.LOGIN]: VerificationCodeType.LOGIN,
      [CodeType.RESET_PASSWORD]: VerificationCodeType.RESET_PASSWORD,
    } as const;
    return typeMap[type];
  }
}
