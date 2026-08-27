import { ForbiddenException } from '@nestjs/common';
import { OAuthClientStatus, OAuthClientType } from '@prisma/client';

import { PrismaService } from '@/prisma/prisma.service';
import { OAuthClientAdminService } from './oauth-client-admin.service';

/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are intentionally untyped. */

describe('OAuthClientAdminService', () => {
  const tx = {
    oAuthClient: { create: jest.fn(), update: jest.fn() },
    oAuthClientAuditLog: { create: jest.fn() },
    oAuthToken: { updateMany: jest.fn() },
    oAuthAuthCode: { deleteMany: jest.fn() },
    oAuthAuthorizationRequest: { updateMany: jest.fn() },
  };
  const prisma = {
    oAuthClient: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    permission: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new OAuthClientAdminService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof tx) => unknown) => callback(tx),
    );
    prisma.permission.findMany.mockResolvedValue([{ code: 'meeting:read' }]);
    tx.oAuthClientAuditLog.create.mockResolvedValue({});
  });

  it.each([
    [OAuthClientType.PUBLIC, false],
    [OAuthClientType.CONFIDENTIAL, true],
  ])(
    'creates a %s client with one-time secret=%s',
    async (clientType, hasSecret) => {
      tx.oAuthClient.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'client-1',
          ...data,
          status: OAuthClientStatus.ACTIVE,
          isSystem: false,
          credentialVersion: 1,
          disabledAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await service.create(
        {
          name: 'Example',
          clientType,
          redirectUris: ['https://example.com/callback'],
          scopes: ['meeting:read'],
        },
        'user-1',
      );

      expect('clientSecret' in result).toBe(hasSecret);
      expect(tx.oAuthClientAuditLog.create).toHaveBeenCalledWith({
        data: expect.not.objectContaining({ clientSecret: expect.anything() }),
      });
    },
  );

  it('rejects writes to a system client', async () => {
    prisma.oAuthClient.findUnique.mockResolvedValue({
      id: 'client-1',
      isSystem: true,
    });

    await expect(service.disable('client-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('increments credential version and revokes grants when disabled', async () => {
    prisma.oAuthClient.findUnique.mockResolvedValue({
      id: 'client-1',
      clientId: 'client-id',
      isSystem: false,
      status: OAuthClientStatus.ACTIVE,
    });
    tx.oAuthClient.update.mockResolvedValue({
      id: 'client-1',
      clientId: 'client-id',
      clientSecret: null,
      clientType: OAuthClientType.PUBLIC,
      status: OAuthClientStatus.DISABLED,
      isSystem: false,
      credentialVersion: 2,
      disabledAt: new Date(),
      name: 'Example',
      description: null,
      logoUri: null,
      redirectUris: ['https://example.com/callback'],
      grants: ['authorization_code', 'refresh_token'],
      scopes: ['meeting:read'],
      createdBy: 'user-1',
      updatedBy: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.disable('client-1', 'user-1');

    expect(tx.oAuthClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ credentialVersion: { increment: 1 } }),
      }),
    );
    expect(tx.oAuthToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: 'client-id', revoked: false },
      }),
    );
  });
});
