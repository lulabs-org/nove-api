import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { NoPermissionRequired } from '@/admin/permission/decorators/permissions.decorator';
import { Public } from '@/auth/decorators/public.decorator';
import { RequireAuth } from '@/auth/decorators/require-auth.decorator';
import { Auth } from '@/auth/decorators/auth.decorator';
import {
  AuthorizeDto,
  AuthorizationDecisionDto,
  RevokeTokenDto,
  TokenDto,
} from '../dto/oauth.dto';
import { OAuthClientService } from '../services/oauth-client.service';
import { OAuthGrantService } from '../services/oauth-grant.service';

@ApiTags('OAuth')
@Controller({ path: 'api/oauth', version: '1' })
@NoPermissionRequired()
export class OAuthController {
  constructor(
    private readonly clientService: OAuthClientService,
    private readonly grantService: OAuthGrantService,
  ) {}

  @Get('authorize')
  @Public()
  @ApiOperation({ summary: 'Start an authorization code flow with PKCE' })
  async authorize(
    @Query(ValidationPipe) query: AuthorizeDto,
    @Res() response: Response,
  ) {
    const request = await this.grantService.createAuthorizationRequest(query);
    const adminUrl = new URL(
      '/oauth/consent',
      process.env.NOVE_ADMIN_URL || 'http://localhost:5173',
    );
    adminUrl.searchParams.set('request_id', request.id);
    return response.redirect(HttpStatus.FOUND, adminUrl.toString());
  }

  @Get('authorization-requests/:requestId')
  @ApiBearerAuth()
  @RequireAuth('jwt')
  getAuthorizationRequest(
    @Param('requestId', new ParseUUIDPipe({ version: '4' })) requestId: string,
    @Auth('userId') userId: string,
  ) {
    return this.grantService.getAuthorizationRequest(requestId, userId);
  }

  @Post('authorization-requests/:requestId/approve')
  @ApiBearerAuth()
  @RequireAuth('jwt')
  approveAuthorizationRequest(
    @Param('requestId', new ParseUUIDPipe({ version: '4' })) requestId: string,
    @Body(ValidationPipe) body: AuthorizationDecisionDto,
    @Auth('userId') userId: string,
  ) {
    return this.grantService.approveAuthorizationRequest(
      requestId,
      userId,
      body,
    );
  }

  @Post('authorization-requests/:requestId/deny')
  @ApiBearerAuth()
  @RequireAuth('jwt')
  denyAuthorizationRequest(
    @Param('requestId', new ParseUUIDPipe({ version: '4' })) requestId: string,
  ) {
    return this.grantService.denyAuthorizationRequest(requestId);
  }

  @Post('token')
  @Public()
  @HttpCode(HttpStatus.OK)
  async token(@Body(ValidationPipe) body: TokenDto) {
    const client = await this.clientService.validateClient(
      body.client_id,
      body.client_secret,
    );
    this.clientService.requireGrant(client.grants, body.grant_type);
    if (body.grant_type === 'authorization_code') {
      if (!body.code || !body.redirect_uri || !body.code_verifier) {
        throw new BadRequestException(
          'code, redirect_uri and code_verifier are required',
        );
      }
      return this.grantService.exchangeCodeForTokens(
        body.client_id,
        body.code,
        body.redirect_uri,
        body.code_verifier,
      );
    }
    if (!body.refresh_token) {
      throw new BadRequestException('refresh_token is required');
    }
    return this.grantService.refreshTokens(body.client_id, body.refresh_token);
  }

  @Post('revoke')
  @Public()
  @HttpCode(HttpStatus.OK)
  async revoke(@Body(ValidationPipe) body: RevokeTokenDto) {
    await this.clientService.validateClient(body.client_id, body.client_secret);
    await this.grantService.revokeRefreshToken(body.client_id, body.token);
    return {};
  }
}
