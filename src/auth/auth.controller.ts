import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  ApiRegisterDocs,
  ApiLoginDocs,
  ApiResetPasswordDocs,
  ApiRefreshTokenDocs,
  ApiLogoutDocs,
} from './decorators/api-docs.decorator';
import {
  RegisterDto,
  LoginDto,
  LogoutDto,
  AuthResponseDto,
  RefreshTokenDto,
} from '@/auth/dto';
import { LoginService, RegisterService, TokenService } from '@/auth/services';
import { PasswordService } from './services/password.service';
import { Public } from '@/auth/decorators/public.decorator';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { User, CurrentUser } from '@/auth/decorators/user.decorator';
import { ClientType } from '@/auth/types/jwt.types';

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
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const ip = this.getClientIp(req);
    const userAgent = req.get('User-Agent');
    const result = await this.registerService.register(
      registerDto,
      ip,
      userAgent,
    );

    const isWebClient = registerDto.clientType === ClientType.Web;
    if (isWebClient) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: (result.refreshExpiresIn || 0) * 1000,
        path: '/',
      });
      const {
        refreshToken: _refreshToken,
        refreshExpiresIn: _refreshExpiresIn,
        ...webResult
      } = result;
      return webResult as AuthResponseDto;
    }

    return result;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiLoginDocs()
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const ip = this.getClientIp(req);
    const userAgent = req.get('User-Agent');
    const result = await this.loginService.login(loginDto, ip, userAgent);

    const isWebClient = loginDto.clientType === ClientType.Web;
    if (isWebClient) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: (result.refreshExpiresIn || 0) * 1000,
        path: '/',
      });
      const {
        refreshToken: _refreshToken,
        refreshExpiresIn: _refreshExpiresIn,
        ...webResult
      } = result;
      return webResult as AuthResponseDto;
    }

    return result;
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
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
    accessToken: string;
    expiresIn: number;
    refreshToken?: string;
    refreshExpiresIn?: number;
  }> {
    const ip = this.getClientIp(req);
    const userAgent = req.get('User-Agent');
    const result = await this.tokenService.refreshToken(
      refreshTokenDto.refreshToken,
      {
        ip,
        userAgent,
        deviceInfo: refreshTokenDto.deviceInfo,
        deviceId: refreshTokenDto.deviceId,
      },
    );

    const isWebClient = refreshTokenDto.clientType === ClientType.Web;
    if (isWebClient) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: (result.refreshExpiresIn || 0) * 1000,
        path: '/',
      });
      return {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      };
    }

    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiLogoutDocs()
  @ApiBearerAuth()
  async logout(
    @User() user: CurrentUser,
    @Req() req: Request,
    @Body(ValidationPipe) logoutDto: LogoutDto = {},
    @Res({ passthrough: true }) res: Response,
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
      const isWebClient = logoutDto.clientType === ClientType.Web;

      // 如果是Web客户端，从cookie中获取refreshToken
      if (isWebClient && !logoutDto.refreshToken) {
        logoutDto.refreshToken = (req as any).cookies?.refreshToken;
      }

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

      // 如果是Web客户端，清除refreshToken cookie
      if (isWebClient) {
        res.clearCookie('refreshToken', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
        });
      }

      this.logger.log(
        `User ${user.id} logout: ${JSON.stringify({
          accessRevoked: logoutResult.accessTokenRevoked,
          refreshRevoked: logoutResult.refreshTokenRevoked,
          allDevices: logoutResult.allDevicesLoggedOut,
          revokedCount: logoutResult.revokedTokensCount,
          ip,
          userAgent,
          isWebClient,
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
