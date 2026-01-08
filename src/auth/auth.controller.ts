import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  ApiRegisterDocs,
  ApiLoginDocs,
  ApiResetPasswordDocs,
  ApiRefreshTokenDocs,
  ApiLogoutDocs,
} from './decorators/api-docs.decorator';
import { Request } from 'express';
import { RegisterService } from './services/register.service';
import { LoginService } from './services/login.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { Public } from '@/auth/decorators/public.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LogoutDto } from './dto/logout.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { User, CurrentUser } from '@/auth/decorators/user.decorator';

@ApiTags('Auth')
@Controller({
  path: 'api/auth',
  version: '1',
})
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly registerService: RegisterService,
    private readonly loginService: LoginService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly tokenBlacklist: TokenBlacklistService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiRegisterDocs()
  async register(
    @Body(ValidationPipe) registerDto: RegisterDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const ip = this.getClientIp(req);
    const userAgent = req.get('User-Agent');
    return await this.registerService.register(registerDto, ip, userAgent);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiLoginDocs()
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const ip = this.getClientIp(req);
    const userAgent = req.get('User-Agent');
    return await this.loginService.login(loginDto, ip, userAgent);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiResetPasswordDocs()
  async resetPassword(
    @Body(ValidationPipe) resetPasswordDto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const ip = this.getClientIp(req);
    const userAgent = req.get('User-Agent');
    return await this.passwordService.resetPassword(
      resetPasswordDto,
      ip,
      userAgent,
    );
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiRefreshTokenDocs()
  async refreshToken(
    @Body(ValidationPipe) refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<{
    accessToken: string;
    expiresIn: number;
    refreshToken: string;
    refreshExpiresIn: number;
  }> {
    const ip = this.getClientIp(req);
    const userAgent = req.get('User-Agent');
    return await this.tokenService.refreshToken(refreshTokenDto.refreshToken, {
      ip,
      userAgent,
      deviceInfo: refreshTokenDto.deviceInfo,
      deviceId: refreshTokenDto.deviceId,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiLogoutDocs()
  @ApiBearerAuth()
  async logout(
    @User() user: CurrentUser,
    @Req() req: Request,
    @Body(ValidationPipe) logoutDto: LogoutDto = {},
  ): Promise<{
    success: boolean;
    message: string;
    details?: {
      accessTokenRevoked: boolean;
      refreshTokenRevoked: boolean;
      allDevicesLoggedOut?: boolean;
      revokedTokensCount?: number;
    };
  }> {
    try {
      // 获取当前访问令牌
      const authHeader = req.get('authorization') || req.get('Authorization');
      const accessToken = authHeader?.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length).trim()
        : undefined;

      if (!accessToken) {
        throw new UnauthorizedException('未找到访问令牌');
      }

      // 获取请求上下文
      const ip = this.getClientIp(req);
      const userAgent = req.get('User-Agent');

      // 执行全面登出
      const logoutResult = await this.tokenService.logout(
        user.id,
        accessToken,
        {
          refreshToken: logoutDto.refreshToken,
          deviceId: logoutDto.deviceId,
          revokeAllDevices: logoutDto.revokeAllDevices,
          userAgent,
          ip,
        },
      );

      this.logger.log(
        `User ${user.id} logout: ${JSON.stringify({
          accessRevoked: logoutResult.accessTokenRevoked,
          refreshRevoked: logoutResult.refreshTokenRevoked,
          allDevices: logoutResult.allDevicesLoggedOut,
          revokedCount: logoutResult.revokedTokensCount,
          ip,
          userAgent,
        })}`,
      );

      return {
        success: true,
        message: logoutResult.message,
        details: {
          accessTokenRevoked: logoutResult.accessTokenRevoked,
          refreshTokenRevoked: logoutResult.refreshTokenRevoked,
          allDevicesLoggedOut: logoutResult.allDevicesLoggedOut,
          revokedTokensCount: logoutResult.revokedTokensCount,
        },
      };
    } catch (error) {
      this.logger.error('Logout failed', error);
      // 即使出错，也要尽力撤销当前访问令牌
      const authHeader = req.get('authorization') || req.get('Authorization');
      const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length).trim()
        : undefined;
      if (token) {
        try {
          await this.tokenBlacklist.add(token);
        } catch {
          // 忽略错误
        }
      }

      return {
        success: true, // 返回成功，因为至少访问令牌被撤销了
        message: '退出登录部分成功，当前会话已终止',
        details: {
          accessTokenRevoked: !!token,
          refreshTokenRevoked: false,
        },
      };
    }
  }

  private getClientIp(req: Request): string {
    const xff = req.headers['x-forwarded-for'];
    const xReal = req.headers['x-real-ip'];
    const forwarded = Array.isArray(xff) ? xff[0] : xff?.split(',')[0];
    const realIp = Array.isArray(xReal) ? xReal[0] : xReal;

    return (
      forwarded?.trim() ||
      realIp?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      '127.0.0.1'
    );
  }
}
