import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

import { PermService } from '@/admin/permission/services/permission.service';
import { PrismaService } from '@/prisma/prisma.service';
import { OAuthClientService } from './oauth-client.service';
import { OAuthGrantService } from './oauth-grant.service';

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- Prisma transaction mocks intentionally use the same structural object. */

describe('OAuthGrantService', () => {
  const prisma = {
    oAuthAuthorizationRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    oAuthAuthCode: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
    },
    oAuthToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    oAuthClient: { findUnique: jest.fn() },
    orgMember: { count: jest.fn(), findMany: jest.fn() },
    permission: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const jwtService = { sign: jest.fn().mockReturnValue('signed-access-token') };
  const clientService = {
    validateRedirectUri: jest.fn(),
    validateRequestedScopes: jest.fn(),
    requireGrant: jest.fn(),
  };
  const permService = { getPermByUserId: jest.fn() };
  const service = new OAuthGrantService(
    prisma as unknown as PrismaService,
    jwtService as never,
    clientService as unknown as OAuthClientService,
    permService as unknown as PermService,
    {
      accessExpiresIn: '15m',
      accessSecret: 'test-secret',
      refreshExpiresIn: '7d',
      refreshSecret: 'refresh-secret',
    },
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
    prisma.oAuthClient.findUnique.mockResolvedValue({
      status: 'ACTIVE',
      credentialVersion: 1,
      grants: ['authorization_code', 'refresh_token'],
      scopes: ['meeting:read'],
    });
  });

  it('persists only client-approved requested scopes and the PKCE challenge', async () => {
    clientService.validateRedirectUri.mockResolvedValue({
      clientId: 'nove-cli',
      scopes: ['meeting:read'],
    });
    clientService.validateRequestedScopes.mockReturnValue(['meeting:read']);
    prisma.oAuthAuthorizationRequest.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'request-1', ...data }),
    );

    await service.createAuthorizationRequest({
      client_id: 'nove-cli',
      code_challenge: 'challenge',
      code_challenge_method: 'S256',
      redirect_uri: 'http://127.0.0.1:43123/oauth/callback',
      response_type: 'code',
      scope: 'meeting:read',
      state: 'state',
    });

    expect(prisma.oAuthAuthorizationRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'nove-cli',
        codeChallenge: 'challenge',
        requestedScopes: ['meeting:read'],
      }),
    });
  });

  it('rejects consent scope escalation before consuming the request', async () => {
    prisma.oAuthAuthorizationRequest.findUnique.mockResolvedValue({
      id: 'request-1',
      clientId: 'nove-cli',
      client: { status: 'ACTIVE' },
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      requestedScopes: ['meeting:read'],
    });

    await expect(
      service.approveAuthorizationRequest('request-1', 'user-1', {
        organization_id: 'org-1',
        scopes: ['meeting:delete'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.oAuthAuthorizationRequest.updateMany).not.toHaveBeenCalled();
  });

  it('verifies PKCE, consumes the code once and stores only a refresh-token hash', async () => {
    const verifier = crypto.randomBytes(48).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    prisma.oAuthAuthCode.findUnique.mockResolvedValue({
      clientId: 'nove-cli',
      codeChallenge: challenge,
      codeHash: 'hash',
      expiresAt: new Date(Date.now() + 60_000),
      organizationId: 'org-1',
      redirectUri: 'http://127.0.0.1:43123/oauth/callback',
      scopes: ['meeting:read'],
      userId: 'user-1',
    });
    prisma.oAuthAuthCode.deleteMany.mockResolvedValue({ count: 1 });
    prisma.oAuthToken.create.mockResolvedValue({});

    const tokens = await service.exchangeCodeForTokens(
      'nove-cli',
      'raw-code',
      'http://127.0.0.1:43123/oauth/callback',
      verifier,
    );

    const stored = prisma.oAuthToken.create.mock.calls[0][0].data;
    expect(stored.refreshTokenHash).toBe(
      crypto.createHash('sha256').update(tokens.refresh_token).digest('hex'),
    );
    expect(stored.refreshTokenHash).not.toBe(tokens.refresh_token);
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'nove-cli',
        org_id: 'org-1',
        scopes: ['meeting:read'],
        token_use: 'oauth_access',
      }),
      expect.any(Object),
    );
  });

  it('revokes a refresh-token family when a rotated token is reused', async () => {
    prisma.oAuthToken.findUnique.mockResolvedValue({
      clientId: 'nove-cli',
      familyId: 'family-1',
      revoked: true,
    });
    prisma.oAuthToken.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.refreshTokens('nove-cli', 'rotated-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.oAuthToken.updateMany).toHaveBeenCalledWith({
      data: expect.objectContaining({ revoked: true }),
      where: { familyId: 'family-1', revoked: false },
    });
  });
});
