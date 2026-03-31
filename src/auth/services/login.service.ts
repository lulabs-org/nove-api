import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { VerificationService } from '@/verification/verification.service';
import { LoginDto } from '../dto/login.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { AuthType } from '@/auth/enums';
import { CodeType } from '@/verification/enums';
import * as bcrypt from 'bcryptjs';
import { TokenService } from './token.service';
import { AuthPolicyService } from './auth-policy.service';
import { UserRepository } from '@/user/repositories/user.repository';
import { formatAuthUserResponse } from '@/auth/utils/auth-user-mapper';

@Injectable()
export class LoginService {
  private readonly logger = new Logger(LoginService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly verificationService: VerificationService,
    private readonly tokenService: TokenService,
    private readonly authPolicy: AuthPolicyService,
  ) {}

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

    await this.authPolicy.checkLoginLockout(target, ip);

    const user = await this.findUserByTarget(target, countryCode);
    if (!user) {
      await this.authPolicy.createLoginLog({
        userId: null,
        target,
        loginType: this.authPolicy.getLoginType(type),
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
        const verifyResult = await this.verificationService.verifyCode(
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

      await this.userRepo.updateLastLogin(user.id, new Date());

      await this.authPolicy.createLoginLog({
        userId: user.id,
        target,
        loginType: this.authPolicy.getLoginType(type),
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

      return {
        user: formatAuthUserResponse(user),
        ...tokens,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.authPolicy.createLoginLog({
        userId: user.id,
        target,
        loginType: this.authPolicy.getLoginType(type),
        success: false,
        ip,
        userAgent,
        failReason: failureReason || errorMessage,
      });
      throw error;
    }
  }

  private async findUserByTarget(target: string, countryCode?: string) {
    const conditions: Array<Record<string, unknown>> = [
      { username: target },
      { email: target },
    ];
    if (countryCode) {
      conditions.push({
        unique_phone_combination: { countryCode, phone: target },
      });
    } else {
      conditions.push({ phone: target });
    }
    return await this.userRepo.findByTarget(target, countryCode);
  }
}
