import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';

import { PermService } from '@/admin/permission/services/permission.service';
import { jwtConfig } from '@/configs/jwt.config';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthorizeDto, AuthorizationDecisionDto } from '../dto/oauth.dto';
import { OAuthClientService } from './oauth-client.service';

const AUTHORIZATION_REQUEST_TTL_MS = 5 * 60 * 1000;
const AUTHORIZATION_CODE_TTL_MS = 5 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function parseAccessTokenTtl(value: string | number): number {
  if (typeof value === 'number') return value;
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 900;
  const amount = Number(match[1]);
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * multipliers[match[2] as keyof typeof multipliers];
}

@Injectable()
export class OAuthGrantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly clientService: OAuthClientService,
    private readonly permService: PermService,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
  ) {}

  async createAuthorizationRequest(dto: AuthorizeDto) {
    const client = await this.clientService.validateRedirectUri(
      dto.client_id,
      dto.redirect_uri,
    );
    const requestedScopes = this.clientService.validateRequestedScopes(
      client.scopes,
      dto.scope.split(/\s+/),
    );

    return this.prisma.oAuthAuthorizationRequest.create({
      data: {
        clientId: client.clientId,
        redirectUri: dto.redirect_uri,
        requestedScopes,
        state: dto.state,
        codeChallenge: dto.code_challenge,
        codeChallengeMethod: dto.code_challenge_method,
        expiresAt: new Date(Date.now() + AUTHORIZATION_REQUEST_TTL_MS),
      },
    });
  }

  async getAuthorizationRequest(requestId: string, userId: string) {
    const request = await this.requireActiveAuthorizationRequest(requestId);
    const userPermissions = await this.permService.getPermByUserId(userId);
    const selectableCodes = request.requestedScopes.filter((scope) =>
      userPermissions.includes(scope),
    );
    const [permissions, memberships] = await Promise.all([
      this.prisma.permission.findMany({
        where: { code: { in: selectableCodes } },
        select: {
          code: true,
          name: true,
          description: true,
          resource: true,
          action: true,
        },
      }),
      this.prisma.orgMember.findMany({
        where: {
          userId,
          status: 'ACTIVE',
          deletedAt: null,
          org: { active: true, deletedAt: null },
        },
        select: { org: { select: { id: true, name: true, code: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    const metadata = new Map(
      permissions.map((permission) => [permission.code, permission]),
    );

    return {
      requestId: request.id,
      client: {
        clientId: request.client.clientId,
        name: request.client.name,
        description: request.client.description,
        logoUri: request.client.logoUri,
      },
      permissions: selectableCodes.map(
        (code) =>
          metadata.get(code) ?? {
            code,
            name: code,
            description: null,
            resource: code.split(':')[0],
            action: code.split(':').slice(1).join(':'),
          },
      ),
      organizations: memberships.map(({ org }) => org),
      expiresAt: request.expiresAt,
    };
  }

  async approveAuthorizationRequest(
    requestId: string,
    userId: string,
    decision: AuthorizationDecisionDto,
  ) {
    const request = await this.requireActiveAuthorizationRequest(requestId);
    const selectedScopes = [...new Set(decision.scopes)];
    const outsideRequest = selectedScopes.filter(
      (scope) => !request.requestedScopes.includes(scope),
    );
    if (outsideRequest.length > 0) {
      throw new BadRequestException(
        `Scopes were not requested by the client: ${outsideRequest.join(', ')}`,
      );
    }

    const userPermissions = await this.permService.getPermByUserId(userId);
    const unavailable = selectedScopes.filter(
      (scope) => !userPermissions.includes(scope),
    );
    if (unavailable.length > 0) {
      throw new BadRequestException(
        `User cannot grant scopes: ${unavailable.join(', ')}`,
      );
    }
    const activeMembership = await this.prisma.orgMember.count({
      where: {
        userId,
        orgId: decision.organization_id,
        status: 'ACTIVE',
        deletedAt: null,
        org: { active: true, deletedAt: null },
      },
    });
    if (activeMembership !== 1) {
      throw new BadRequestException(
        'User does not belong to the selected organization',
      );
    }

    const code = crypto.randomBytes(32).toString('base64url');
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.oAuthAuthorizationRequest.updateMany({
        where: {
          id: request.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) {
        throw new BadRequestException(
          'Authorization request is no longer active',
        );
      }
      await tx.oAuthAuthCode.create({
        data: {
          codeHash: hash(code),
          clientId: request.clientId,
          userId,
          organizationId: decision.organization_id,
          redirectUri: request.redirectUri,
          scopes: selectedScopes,
          codeChallenge: request.codeChallenge,
          codeChallengeMethod: request.codeChallengeMethod,
          expiresAt: new Date(Date.now() + AUTHORIZATION_CODE_TTL_MS),
        },
      });
    });

    return {
      redirect_uri: this.authorizationRedirect(request.redirectUri, {
        code,
        state: request.state,
      }),
    };
  }

  async denyAuthorizationRequest(requestId: string) {
    const request = await this.requireActiveAuthorizationRequest(requestId);
    const consumed = await this.prisma.oAuthAuthorizationRequest.updateMany({
      where: {
        id: request.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) {
      throw new BadRequestException(
        'Authorization request is no longer active',
      );
    }
    return {
      redirect_uri: this.authorizationRedirect(request.redirectUri, {
        error: 'access_denied',
        state: request.state,
      }),
    };
  }

  async exchangeCodeForTokens(
    clientId: string,
    code: string,
    redirectUri: string,
    codeVerifier: string,
  ) {
    if (!/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)) {
      throw new BadRequestException('Invalid PKCE code_verifier');
    }
    const codeHash = hash(code);
    const authCode = await this.prisma.oAuthAuthCode.findUnique({
      where: { codeHash },
    });
    if (!authCode || authCode.clientId !== clientId) {
      throw new BadRequestException('Invalid authorization code');
    }
    if (authCode.redirectUri !== redirectUri) {
      throw new BadRequestException('Redirect URI mismatch');
    }
    if (authCode.expiresAt <= new Date()) {
      await this.prisma.oAuthAuthCode.deleteMany({ where: { codeHash } });
      throw new BadRequestException('Authorization code expired');
    }
    const actualChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    if (actualChallenge !== authCode.codeChallenge) {
      throw new BadRequestException('PKCE verification failed');
    }

    return this.prisma.$transaction(async (tx) => {
      const consumed = await tx.oAuthAuthCode.deleteMany({
        where: { codeHash },
      });
      if (consumed.count !== 1) {
        throw new BadRequestException(
          'Authorization code has already been used',
        );
      }
      return this.generateTokens(tx, {
        clientId,
        userId: authCode.userId,
        organizationId: authCode.organizationId,
        scopes: authCode.scopes,
        familyId: crypto.randomUUID(),
      });
    });
  }

  async refreshTokens(clientId: string, refreshToken: string) {
    const refreshTokenHash = hash(refreshToken);
    const token = await this.prisma.oAuthToken.findUnique({
      where: { refreshTokenHash },
    });
    if (!token || token.clientId !== clientId) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (token.revoked) {
      await this.revokeFamily(token.familyId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (token.expiresAt <= new Date()) {
      await this.revokeFamily(token.familyId);
      throw new UnauthorizedException('Refresh token expired');
    }

    return this.prisma.$transaction(async (tx) => {
      const rotated = await tx.oAuthToken.updateMany({
        where: { id: token.id, revoked: false },
        data: { revoked: true, revokedAt: new Date(), rotatedAt: new Date() },
      });
      if (rotated.count !== 1) {
        await tx.oAuthToken.updateMany({
          where: { familyId: token.familyId, revoked: false },
          data: { revoked: true, revokedAt: new Date() },
        });
        throw new UnauthorizedException('Refresh token reuse detected');
      }
      return this.generateTokens(tx, {
        clientId,
        userId: token.userId,
        organizationId: token.organizationId,
        scopes: token.scopes,
        familyId: token.familyId,
      });
    });
  }

  async revokeRefreshToken(clientId: string, refreshToken: string) {
    const token = await this.prisma.oAuthToken.findUnique({
      where: { refreshTokenHash: hash(refreshToken) },
    });
    if (token?.clientId === clientId) await this.revokeFamily(token.familyId);
  }

  private async requireActiveAuthorizationRequest(requestId: string) {
    const request = await this.prisma.oAuthAuthorizationRequest.findUnique({
      where: { id: requestId },
      include: { client: true },
    });
    if (
      !request ||
      request.client.status !== 'ACTIVE' ||
      request.consumedAt ||
      request.expiresAt <= new Date()
    ) {
      throw new BadRequestException(
        'Authorization request is invalid or expired',
      );
    }
    return request;
  }

  private authorizationRedirect(
    redirectUri: string,
    values: Record<string, string>,
  ) {
    const url = new URL(redirectUri);
    for (const [key, value] of Object.entries(values)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private async generateTokens(
    tx: Prisma.TransactionClient,
    grant: {
      clientId: string;
      userId: string;
      organizationId: string;
      scopes: string[];
      familyId: string;
    },
  ) {
    const client = await tx.oAuthClient.findUnique({
      where: { clientId: grant.clientId },
      select: {
        status: true,
        credentialVersion: true,
        grants: true,
        scopes: true,
      },
    });
    if (!client || client.status !== 'ACTIVE') {
      throw new UnauthorizedException('OAuth client is disabled');
    }
    this.clientService.requireGrant(client.grants, 'refresh_token');
    const effectiveScopes = grant.scopes.filter((scope) =>
      client.scopes.includes(scope),
    );
    const expiresIn = parseAccessTokenTtl(this.config.accessExpiresIn);
    const accessToken = this.jwtService.sign(
      {
        sub: grant.userId,
        client_id: grant.clientId,
        token_use: 'oauth_access',
        org_id: grant.organizationId,
        scopes: effectiveScopes,
        credential_version: client.credentialVersion,
      },
      {
        secret: this.config.accessSecret,
        expiresIn: this.config.accessExpiresIn,
        jwtid: crypto.randomUUID(),
      },
    );
    const refreshToken = crypto.randomBytes(64).toString('base64url');
    await tx.oAuthToken.create({
      data: {
        refreshTokenHash: hash(refreshToken),
        familyId: grant.familyId,
        clientId: grant.clientId,
        userId: grant.userId,
        organizationId: grant.organizationId,
        scopes: effectiveScopes,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: effectiveScopes.join(' '),
      organization_id: grant.organizationId,
    };
  }

  private async revokeFamily(familyId: string) {
    await this.prisma.oAuthToken.updateMany({
      where: { familyId, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });
  }
}
