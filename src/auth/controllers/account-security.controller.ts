import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { NoPermissionRequired } from '@/admin/permission/decorators/permissions.decorator';
import { RequireAuth } from '@/auth/decorators/require-auth.decorator';
import { Auth } from '@/auth/decorators/auth.decorator';
import { HttpUtil } from '@/common/utils/http.util';
import { AccountSecurityService } from '@/auth/services/account-security.service';
import {
  AccountSecurityResponseDto,
  ChangeEmailDto,
  ChangePasswordDto,
  ChangePhoneDto,
  ContactChangeResponseDto,
  LoginActivitiesQueryDto,
  LoginActivitiesResponseDto,
  SecuritySessionDto,
  SecurityCodeSentResponseDto,
  SecurityProofDto,
  SendEmailChangeCodeDto,
  SendIdentityCodeDto,
  SendPhoneChangeCodeDto,
  VerifyIdentityResponseDto,
} from '@/auth/dto/account-security.dto';

@ApiTags('Account Security')
@ApiBearerAuth()
@RequireAuth('jwt')
@NoPermissionRequired()
@Controller('api/user/security')
export class AccountSecurityController {
  constructor(private readonly service: AccountSecurityService) {}

  @Get()
  @ApiOperation({ summary: '获取当前用户安全状态' })
  @ApiOkResponse({ type: AccountSecurityResponseDto })
  getSecurity(@Auth('userId') userId: string) {
    return this.service.getSecurity(this.resolveUserId(userId));
  }

  @Post('verify-identity')
  @ApiOperation({ summary: '在敏感操作前校验当前用户身份' })
  @ApiOkResponse({ type: VerifyIdentityResponseDto })
  verifyIdentity(
    @Auth('userId') userId: string,
    @Body() dto: SecurityProofDto,
  ) {
    return this.service.verifyIdentity(this.resolveUserId(userId), dto);
  }

  @Put('password')
  @ApiOperation({ summary: '设置或修改当前用户密码' })
  async changePassword(
    @Auth('userId') userId: string,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.changePassword(
      this.resolveUserId(userId),
      dto,
      this.getRefreshToken(req),
    );
    if (!result.currentSessionPreserved) this.clearRefreshCookie(res);
    return result;
  }

  @Post('identity-code')
  @ApiOperation({ summary: '向当前已验证联系方式发送身份确认码' })
  @ApiOkResponse({ type: SecurityCodeSentResponseDto })
  sendIdentityCode(
    @Auth('userId') userId: string,
    @Body() dto: SendIdentityCodeDto,
    @Req() req: Request,
  ) {
    return this.service.sendIdentityCode(
      this.resolveUserId(userId),
      dto.channel,
      HttpUtil.getClientIp(req),
      req.get('User-Agent'),
    );
  }

  @Post('email/code')
  @ApiOperation({ summary: '向新邮箱发送换绑验证码' })
  @ApiOkResponse({ type: SecurityCodeSentResponseDto })
  sendEmailCode(
    @Auth('userId') userId: string,
    @Body() dto: SendEmailChangeCodeDto,
    @Req() req: Request,
  ) {
    return this.service.sendEmailChangeCode(
      this.resolveUserId(userId),
      dto.email,
      HttpUtil.getClientIp(req),
      req.get('User-Agent'),
    );
  }

  @Put('email')
  @ApiOperation({ summary: '换绑邮箱' })
  @ApiOkResponse({ type: ContactChangeResponseDto })
  async changeEmail(
    @Auth('userId') userId: string,
    @Body() dto: ChangeEmailDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.changeEmail(
      this.resolveUserId(userId),
      dto,
      {
        ip: HttpUtil.getClientIp(req),
        userAgent: req.get('User-Agent'),
        currentRefreshToken: this.getRefreshToken(req),
      },
    );
    if (!result.currentSessionPreserved) this.clearRefreshCookie(res);
    return result;
  }

  @Post('phone/code')
  @ApiOperation({ summary: '向新手机号发送换绑验证码' })
  @ApiOkResponse({ type: SecurityCodeSentResponseDto })
  sendPhoneCode(
    @Auth('userId') userId: string,
    @Body() dto: SendPhoneChangeCodeDto,
    @Req() req: Request,
  ) {
    return this.service.sendPhoneChangeCode(
      this.resolveUserId(userId),
      dto.countryCode,
      dto.phone,
      HttpUtil.getClientIp(req),
      req.get('User-Agent'),
    );
  }

  @Put('phone')
  @ApiOperation({ summary: '换绑手机号' })
  @ApiOkResponse({ type: ContactChangeResponseDto })
  async changePhone(
    @Auth('userId') userId: string,
    @Body() dto: ChangePhoneDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.changePhone(
      this.resolveUserId(userId),
      dto,
      {
        ip: HttpUtil.getClientIp(req),
        userAgent: req.get('User-Agent'),
        currentRefreshToken: this.getRefreshToken(req),
      },
    );
    if (!result.currentSessionPreserved) this.clearRefreshCookie(res);
    return result;
  }

  @Get('sessions')
  @ApiOperation({ summary: '获取当前用户活跃会话' })
  @ApiOkResponse({ type: SecuritySessionDto, isArray: true })
  listSessions(@Auth('userId') userId: string, @Req() req: Request) {
    return this.service.listSessions(
      this.resolveUserId(userId),
      this.getRefreshToken(req),
    );
  }

  @Delete('sessions/others')
  @ApiOperation({ summary: '撤销当前用户的其他会话' })
  revokeOtherSessions(@Auth('userId') userId: string, @Req() req: Request) {
    return this.service.revokeOtherSessions(
      this.resolveUserId(userId),
      this.getRefreshToken(req),
    );
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: '撤销指定会话' })
  revokeSession(
    @Auth('userId') userId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.service.revokeSession(
      this.resolveUserId(userId),
      id,
      this.getRefreshToken(req),
    );
  }

  @Get('login-activities')
  @ApiOperation({ summary: '获取最近 30 天登录记录' })
  @ApiOkResponse({ type: LoginActivitiesResponseDto })
  getLoginActivities(
    @Auth('userId') userId: string,
    @Query() query: LoginActivitiesQueryDto,
  ) {
    return this.service.getLoginActivities(this.resolveUserId(userId), query);
  }

  private resolveUserId(userId: string | { id?: string }): string {
    return typeof userId === 'string' ? userId : userId?.id || '';
  }

  private getRefreshToken(req: Request): string | undefined {
    return req.cookies?.refreshToken as string | undefined;
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });
  }
}
