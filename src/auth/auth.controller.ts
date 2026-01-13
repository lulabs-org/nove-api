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
  Get,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  ApiRegisterDocs,
  ApiLoginDocs,
  ApiResetPasswordDocs,
  ApiRefreshTokenDocs,
  ApiLogoutDocs,
  ApiGetMeDocs,
  ApiGetPermissionsDocs,
} from './decorators';
import {
  RegisterDto,
  LoginDto,
  LogoutDto,
  AuthResponseDto,
  RefreshTokenDto,
  AuthUserWithPermissionsDto,
  PermissionsResponseDto,
} from '@/auth/dto';
import { LoginService, RegisterService, TokenService } from '@/auth/services';
import { PasswordService } from './services/password.service';
import { Public } from '@/auth/decorators/public.decorator';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { User, CurrentUser } from '@/auth/decorators/user.decorator';
import { ClientType } from '@/auth/types/jwt.types';
import { PermissionService } from '@/permission/services/permission.service';
import { HttpUtil } from '@/common/utils';

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
    private readonly permissionService: PermissionService,
  ) {}

  private setRefreshTokenCookie(
    res: Response,
    token: string,
    expiresIn?: number,
  ): void {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: expiresIn ? expiresIn * 1000 : 0,
      path: '/',
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiRegisterDocs()
  async register(
    @Body(ValidationPipe) registerDto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const ip = HttpUtil.getClientIp(req);
    const userAgent = req.get('User-Agent');
    const result = await this.registerService.register(
      registerDto,
      ip,
      userAgent,
    );

    const isWebClient = registerDto.clientType === ClientType.Web;
    if (isWebClient) {
      if (result.refreshToken) {
        this.setRefreshTokenCookie(
          res,
          result.refreshToken,
          result.refreshExpiresIn,
        );
      }

      return {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        user: result.user,
      } as AuthResponseDto;
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
    const ip = HttpUtil.getClientIp(req);
    const userAgent = req.get('User-Agent');
    const result = await this.loginService.login(loginDto, ip, userAgent);

    const isWebClient = loginDto.clientType === ClientType.Web;
    if (isWebClient) {
      if (result.refreshToken) {
        this.setRefreshTokenCookie(
          res,
          result.refreshToken,
          result.refreshExpiresIn,
        );
      }

      return {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        user: result.user,
      } as AuthResponseDto;
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
    const ip = HttpUtil.getClientIp(req);
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
    const ip = HttpUtil.getClientIp(req);
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
      this.setRefreshTokenCookie(
        res,
        result.refreshToken,
        result.refreshExpiresIn,
      );
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
      const ip = HttpUtil.getClientIp(req);
      const userAgent = req.get('User-Agent');
      const isWebClient = logoutDto.clientType === ClientType.Web;

      // 如果是Web客户端，从cookie中获取refreshToken
      if (isWebClient && !logoutDto.refreshToken) {
        const cookies = req.cookies as unknown;

        if (cookies && typeof cookies === 'object') {
          const rt = (cookies as Record<string, unknown>).refreshToken;
          if (typeof rt === 'string') {
            logoutDto.refreshToken = rt;
          }
        }
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
        this.clearRefreshTokenCookie(res);
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

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiGetMeDocs()
  @ApiBearerAuth()
  async getMe(@User() user: CurrentUser): Promise<AuthUserWithPermissionsDto> {
    const roles = user.roles || ['USER'];
    const permissions =
      await this.permissionService.getPermissionsByRoleCodes(roles);

    return {
      id: user.id,
      username: user.username || undefined,
      email: user.email,
      phone: user.phone || undefined,
      countryCode: user.countryCode || undefined,
      name:
        (user.profile?.displayName as string) ||
        user.username ||
        user.email ||
        user.phone ||
        'Unknown',
      avatar: (user.profile?.avatar as string) || undefined,
      roles,
      permissions,
      active: user.active,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString(),
    };
  }

  @Get('permissions')
  @HttpCode(HttpStatus.OK)
  @ApiGetPermissionsDocs()
  @ApiBearerAuth()
  async getPermissions(
    @User() user: CurrentUser,
  ): Promise<PermissionsResponseDto> {
    const roles = user.roles || ['USER'];
    const permissions =
      await this.permissionService.getPermissionsByRoleCodes(roles);

    return {
      id: user.id,
      name:
        (user.profile?.displayName as string) ||
        user.username ||
        user.email ||
        user.phone ||
        'Unknown',
      roles,
      permissions,
    };
  }
}
