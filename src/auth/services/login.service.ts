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
import { TokenService } from './token.service';
import { AuthPolicyService } from './auth-policy.service';
import { UserRepository } from '@/user/repositories/user.repository';
import { formatAuthUserResponse } from '@/auth/utils/auth-user-mapper';
import { LocalStrategy } from '../strategies/local.strategy';
import type { User } from '@prisma/client';

@Injectable()
export class LoginService {
  private readonly logger = new Logger(LoginService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly verificationService: VerificationService,
    private readonly tokenService: TokenService,
    private readonly authPolicy: AuthPolicyService,
    private readonly localStrategy: LocalStrategy,
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

    let user: User | null = null;
    let failureReason = '';

    try {
      if (type === AuthType.EMAIL_CODE || type === AuthType.PHONE_CODE) {
        user = await this.userRepo.findUserByTarget(target, countryCode);
        if (!user) {
          failureReason = '用户不存在';
          throw new UnauthorizedException('用户不存在');
        }

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
        try {
          user = await this.localStrategy.validate(target, password!);
        } catch (error) {
          if (error instanceof UnauthorizedException) {
            failureReason = error.message;
          }
          throw error;
        }
      }

      await this.userRepo.updateUserLastLoginAt(user.id, new Date());

      await this.authPolicy.createLoginLog({
        userId: user.id,
        target,
        loginType: this.authPolicy.getLoginType(type),
        success: true,
        ip,
        userAgent,
      });

      const userWithProfileAndRoles =
        await this.userRepo.getUserByIdWithProfileAndRoles(user.id);

      const tokens = await this.tokenService.generateTokens(user.id, {
        ip,
        userAgent,
        deviceInfo: loginDto.deviceInfo,
        deviceId: loginDto.deviceId,
      });

      return {
        user: formatAuthUserResponse(userWithProfileAndRoles!),
        ...tokens,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const userId = user?.id || null;
      await this.authPolicy.createLoginLog({
        userId,
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
}
