import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { VerificationService } from '@/verification/verification.service';
import { MailService } from '@/mail/mail.service';
import { RegisterDto } from '../dto/register.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { AuthType } from '@/auth/enums';
import { CodeType } from '@/verification/enums';
import { UserRepository } from '@/user/repositories/user.repository';
import { TokenService } from './token.service';
import { AuthPolicyService } from './auth-policy.service';
import { formatAuthUserResponse } from '@/auth/utils/auth-user-mapper';
import { hashPassword, validatePassword } from '@/common/utils/password.util';

@Injectable()
export class RegisterService {
  private readonly logger = new Logger(RegisterService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly verificationService: VerificationService,
    private readonly mailService: MailService,
    private readonly tokenService: TokenService,
    private readonly authPolicy: AuthPolicyService,
  ) {}

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
      const verifyResult = await this.verificationService.verifyCode(
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

    const user = await this.userRepo.createWithProfile({
      username,
      email: email || null,
      phone,
      countryCode,
      password: hashedPassword,
      emailVerifiedAt: type === AuthType.EMAIL_CODE ? now : null,
      phoneVerifiedAt: type === AuthType.PHONE_CODE ? now : null,
      profileName: username || email?.split('@')[0] || phone || '用户',
    });

    await this.authPolicy.createLoginLog({
      userId: user.id,
      target: email || phone || username!,
      loginType: this.authPolicy.getLoginType(type),
      success: true,
      ip,
      userAgent,
    });

    if (email) {
      try {
        await this.mailService.sendWelcomeEmail(email, username || 'User');
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

    return {
      user: formatAuthUserResponse(user),
      ...tokens,
    };
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

    const existingUser = await this.userRepo.findFirst(conditions);

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
