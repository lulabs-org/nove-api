import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { OAuthClientService } from '../services/oauth-client.service';
import { OAuthGrantService } from '../services/oauth-grant.service';
import { AuthorizeDto, TokenDto } from '../dto/oauth.dto';
import { RequireAuth } from '@/auth/decorators/require-auth.decorator';
import { User, CurrentUser } from '@/auth/decorators/user.decorator';
import { Public } from '@/auth/decorators/public.decorator';

@ApiTags('OAuth')
@Controller({
  path: 'api/oauth',
  version: '1',
})
export class OAuthController {
  constructor(
    private readonly clientService: OAuthClientService,
    private readonly grantService: OAuthGrantService,
  ) {}

  /**
   * 第三方应用引导用户进行授权的端点 (验证 Client, 然后由前端提供同意页面)
   */
  @Get('authorize')
  @Public()
  @ApiOperation({ summary: '发起授权请求' })
  async authorizeGet(
    @Query(ValidationPipe) query: AuthorizeDto,
    @Res() res: Response,
  ) {
    if (query.response_type !== 'code') {
      throw new BadRequestException('Unsupported response_type');
    }

    // 验证客户端和回调地址
    await this.clientService.validateRedirectUri(
      query.client_id,
      query.redirect_uri,
    );

    // 实际项目中这里应重定向到前端的授权确认页面 (Consent Page)
    // 前端页面通过获取 URL 上的参数展示给用户，并调用 POST /authorize 确认授权
    // 例如: return res.redirect(`https://your-frontend.com/oauth/consent?client_id=${...}`);

    // 为了简单演示，我们返回一个成功信息要求前端渲染确认页
    return res.status(HttpStatus.OK).json({
      message: 'Client validated. Please proceed to consent.',
      client_id: query.client_id,
      redirect_uri: query.redirect_uri,
      scope: query.scope,
      state: query.state,
    });
  }

  /**
   * 用户同意授权后，生成 Authorization Code 并重定向回第三方应用
   */
  @Post('authorize')
  @ApiBearerAuth()
  @RequireAuth('jwt')
  @ApiOperation({ summary: '同意授权并生成 Code' })
  async authorizePost(
    @Body(ValidationPipe) body: AuthorizeDto,
    @User() user: CurrentUser,
    @Res() res: Response,
  ) {
    if (body.response_type !== 'code') {
      throw new BadRequestException('Unsupported response_type');
    }

    await this.clientService.validateRedirectUri(
      body.client_id,
      body.redirect_uri,
    );

    const scopes = body.scope ? body.scope.split(' ') : [];

    const code = await this.grantService.createAuthorizationCode(
      body.client_id,
      user.id,
      body.redirect_uri,
      scopes,
    );

    const redirectUrl = new URL(body.redirect_uri);
    redirectUrl.searchParams.append('code', code);
    if (body.state) {
      redirectUrl.searchParams.append('state', body.state);
    }

    // 返回重定向地址，供前端执行跳转或直接 302
    return res.status(HttpStatus.OK).json({
      redirect_uri: redirectUrl.toString(),
    });
  }

  /**
   * 第三方应用使用 Authorization Code 换取 Access Token
   */
  @Post('token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '使用授权码换取 Token 或 刷新 Token' })
  async token(@Body(ValidationPipe) body: TokenDto) {
    // 验证客户端凭据 (在实际 OAuth 中，可以通过 Basic Auth 头传递，这里简单使用 body)
    await this.clientService.validateClient(body.client_id, body.client_secret);

    if (body.grant_type === 'authorization_code') {
      if (!body.code) {
        throw new BadRequestException(
          'code is required for authorization_code grant',
        );
      }
      return this.grantService.exchangeCodeForTokens(
        body.client_id,
        body.code,
        body.redirect_uri,
      );
    } else if (body.grant_type === 'refresh_token') {
      if (!body.refresh_token) {
        throw new BadRequestException(
          'refresh_token is required for refresh_token grant',
        );
      }
      return this.grantService.refreshTokens(
        body.client_id,
        body.refresh_token,
      );
    }

    throw new BadRequestException('Unsupported grant_type');
  }
}
