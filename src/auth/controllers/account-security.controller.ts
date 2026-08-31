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
import { CurrentUser, User } from '@/auth/decorators/user.decorator';
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
  getSecurity(@User() user: CurrentUser) {
    return this.service.getSecurity(user.id);
  }

  @Post('verify-identity')
  @ApiOperation({ summary: '在敏感操作前校验当前用户身份' })
  @ApiOkResponse({ type: VerifyIdentityResponseDto })
  verifyIdentity(@User() user: CurrentUser, @Body() dto: SecurityProofDto) {
    return this.service.verifyIdentity(user.id, dto);
  }

  @Put('password')
  @ApiOperation({ summary: '设置或修改当前用户密码' })
  async changePassword(
    @User() user: CurrentUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.changePassword(
      user.id,
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
    @User() user: CurrentUser,
    @Body() dto: SendIdentityCodeDto,
    @Req() req: Request,
  ) {
    return this.service.sendIdentityCode(
      user.id,
      dto.channel,
      HttpUtil.getClientIp(req),
      req.get('User-Agent'),
    );
  }

  @Post('email/code')
  @ApiOperation({ summary: '向新邮箱发送换绑验证码' })
  @ApiOkResponse({ type: SecurityCodeSentResponseDto })
  sendEmailCode(
    @User() user: CurrentUser,
    @Body() dto: SendEmailChangeCodeDto,
    @Req() req: Request,
  ) {
    return this.service.sendEmailChangeCode(
      user.id,
      dto.email,
      HttpUtil.getClientIp(req),
      req.get('User-Agent'),
    );
  }

  @Put('email')
  @ApiOperation({ summary: '换绑邮箱' })
  @ApiOkResponse({ type: ContactChangeResponseDto })
  async changeEmail(
    @User() user: CurrentUser,
    @Body() dto: ChangeEmailDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.changeEmail(user.id, dto, {
      ip: HttpUtil.getClientIp(req),
      userAgent: req.get('User-Agent'),
      currentRefreshToken: this.getRefreshToken(req),
    });
    if (!result.currentSessionPreserved) this.clearRefreshCookie(res);
    return result;
  }

  @Post('phone/code')
  @ApiOperation({ summary: '向新手机号发送换绑验证码' })
  @ApiOkResponse({ type: SecurityCodeSentResponseDto })
  sendPhoneCode(
    @User() user: CurrentUser,
    @Body() dto: SendPhoneChangeCodeDto,
    @Req() req: Request,
  ) {
    return this.service.sendPhoneChangeCode(
      user.id,
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
    @User() user: CurrentUser,
    @Body() dto: ChangePhoneDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.changePhone(user.id, dto, {
      ip: HttpUtil.getClientIp(req),
      userAgent: req.get('User-Agent'),
      currentRefreshToken: this.getRefreshToken(req),
    });
    if (!result.currentSessionPreserved) this.clearRefreshCookie(res);
    return result;
  }

  @Get('sessions')
  @ApiOperation({ summary: '获取当前用户活跃会话' })
  @ApiOkResponse({ type: SecuritySessionDto, isArray: true })
  listSessions(@User() user: CurrentUser, @Req() req: Request) {
    return this.service.listSessions(user.id, this.getRefreshToken(req));
  }

  @Delete('sessions/others')
  @ApiOperation({ summary: '撤销当前用户的其他会话' })
  revokeOtherSessions(@User() user: CurrentUser, @Req() req: Request) {
    return this.service.revokeOtherSessions(user.id, this.getRefreshToken(req));
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: '撤销指定会话' })
  revokeSession(
    @User() user: CurrentUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.service.revokeSession(user.id, id, this.getRefreshToken(req));
  }

  @Get('login-activities')
  @ApiOperation({ summary: '获取最近 30 天登录记录' })
  @ApiOkResponse({ type: LoginActivitiesResponseDto })
  getLoginActivities(
    @User() user: CurrentUser,
    @Query() query: LoginActivitiesQueryDto,
  ) {
    return this.service.getLoginActivities(user.id, query);
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
