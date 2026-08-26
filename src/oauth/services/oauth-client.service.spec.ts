import { BadRequestException } from '@nestjs/common';
import { OAuthClientStatus, OAuthClientType } from '@prisma/client';

import { PrismaService } from '@/prisma/prisma.service';
import { OAuthClientService } from './oauth-client.service';

describe('OAuthClientService', () => {
  const findUnique = jest.fn();
  const prisma = {
    oAuthClient: { findUnique },
  } as unknown as PrismaService;
  const service = new OAuthClientService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('accepts a dynamic loopback port for the registered CLI callback', async () => {
    findUnique.mockResolvedValue({
      clientId: 'nove-cli',
      clientType: OAuthClientType.PUBLIC,
      status: OAuthClientStatus.ACTIVE,
      redirectUris: ['http://127.0.0.1/oauth/callback'],
    });

    await expect(
      service.validateRedirectUri(
        'nove-cli',
        'http://127.0.0.1:54321/oauth/callback',
      ),
    ).resolves.toBeDefined();
  });

  it.each([
    'http://localhost:54321/oauth/callback',
    'http://127.0.0.1:54321/other',
    'http://127.0.0.1:54321/oauth/callback?next=bad',
    'https://127.0.0.1:54321/oauth/callback',
  ])('rejects an unsafe loopback redirect: %s', async (redirectUri) => {
    findUnique.mockResolvedValue({
      clientId: 'nove-cli',
      clientType: OAuthClientType.PUBLIC,
      status: OAuthClientStatus.ACTIVE,
      redirectUris: ['http://127.0.0.1/oauth/callback'],
    });

    await expect(
      service.validateRedirectUri('nove-cli', redirectUri),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows public clients without a secret but rejects out-of-catalog scopes', async () => {
    findUnique.mockResolvedValue({
      clientId: 'nove-cli',
      clientSecret: null,
      clientType: OAuthClientType.PUBLIC,
      status: OAuthClientStatus.ACTIVE,
      scopes: ['meeting:read'],
    });

    await expect(service.validateClient('nove-cli')).resolves.toBeDefined();
    expect(() =>
      service.validateRequestedScopes(
        ['meeting:read'],
        ['meeting:read', 'user:delete'],
      ),
    ).toThrow('Client is not allowed to request scopes: user:delete');
  });
});
