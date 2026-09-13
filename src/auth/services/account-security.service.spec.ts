import { BadRequestException, ConflictException } from '@nestjs/common';
import { AccountSecurityService } from './account-security.service';
import {
  SecurityCodeChannel,
  SecurityVerificationMethod,
} from '@/auth/dto/account-security.dto';

const user = {
  id: 'user-1',
  username: 'tester',
  passwordHash: 'hash',
  passwordAlgo: 'bcrypt',
  passwordParams: null,
  passwordSetAt: new Date('2026-08-01T00:00:00.000Z'),
  email: 'old@example.com',
  emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
  countryCode: '+86',
  phone: '13800138000',
  phoneVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  deletedAt: null,
};

const firstMockArgument = (mock: jest.Mock): unknown =>
  (mock.mock.calls as unknown[][])[0]?.[0];

describe('AccountSecurityService', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    verificationCode: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {},
    $transaction: jest.fn(),
  };
  const verification = { sendSecurityCode: jest.fn() };
  const refreshTokens = {
    findByToken: jest.fn(),
    findActiveByUserId: jest.fn(),
    revokeByIdForUser: jest.fn(),
    revokeAllTokensByUserId: jest.fn(),
  };
  const auditCrypto = {
    keyVersion: 'v1',
    encryptSnapshot: jest.fn(
      (value: unknown) => `encrypted:${JSON.stringify(value)}`,
    ),
  };
  let service: AccountSecurityService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findFirst.mockResolvedValue(user);
    prisma.user.findUnique.mockResolvedValue(null);
    service = new AccountSecurityService(
      prisma as never,
      verification as never,
      refreshTokens as never,
      auditCrypto as never,
    );
  });

  it('returns only security status and available proof methods', async () => {
    await expect(service.getSecurity('user-1')).resolves.toEqual({
      hasPassword: true,
      passwordSetAt: user.passwordSetAt,
      email: user.email,
      emailVerified: true,
      countryCode: '+86',
      phone: user.phone,
      phoneVerified: true,
      availableVerificationMethods: [
        SecurityVerificationMethod.PASSWORD,
        SecurityVerificationMethod.EMAIL_CODE,
        SecurityVerificationMethod.PHONE_CODE,
      ],
    });
  });

  it('sends identity codes only to the stored verified target', async () => {
    verification.sendSecurityCode.mockResolvedValue({
      success: true,
      message: 'ok',
    });

    await expect(
      service.sendIdentityCode(
        'user-1',
        SecurityCodeChannel.EMAIL,
        '127.0.0.1',
      ),
    ).resolves.toMatchObject({ maskedTarget: 'ol***@example.com' });
    expect(verification.sendSecurityCode).toHaveBeenCalledWith(
      'old@example.com',
      'identity_confirm',
      '127.0.0.1',
      undefined,
    );
  });

  it('rejects an email already owned by another account before sending code', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });

    await expect(
      service.sendEmailChangeCode('user-1', 'used@example.com', '127.0.0.1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(verification.sendSecurityCode).not.toHaveBeenCalled();
  });

  it('does not allow the current session to be revoked as another device', async () => {
    refreshTokens.findByToken.mockResolvedValue({ id: 'session-1' });

    await expect(
      service.revokeSession('user-1', 'session-1', 'raw-refresh-token'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(refreshTokens.revokeByIdForUser).not.toHaveBeenCalled();
  });

  it('rejects an incorrect password during identity pre-validation', async () => {
    await expect(
      service.verifyIdentity('user-1', {
        verificationMethod: SecurityVerificationMethod.PASSWORD,
        currentPassword: 'definitely-wrong',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('writes encrypted email audit and outbox records while revoking other sessions', async () => {
    const tx = {
      user: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          ...user,
          email: 'new@example.com',
          emailVerifiedAt: new Date(),
        }),
      },
      userSecurityAuditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      securityNotificationOutbox: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      verificationCode: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      refreshToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: unknown) => {
      if (typeof callback !== 'function') {
        throw new TypeError('Expected an interactive transaction callback');
      }
      return (callback as (transaction: typeof tx) => Promise<unknown>)(tx);
    });
    prisma.verificationCode.findFirst
      .mockResolvedValueOnce({
        id: 'proof-code',
        code: '111111',
        attemptCount: 0,
      })
      .mockResolvedValueOnce({
        id: 'new-code',
        code: '222222',
        attemptCount: 0,
      });
    refreshTokens.findByToken.mockResolvedValue({
      id: 'session-current',
      userId: user.id,
      deviceId: 'device-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await service.changeEmail(
      user.id,
      {
        verificationMethod: SecurityVerificationMethod.EMAIL_CODE,
        identityCode: '111111',
        email: 'new@example.com',
        newCode: '222222',
      },
      {
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        currentRefreshToken: 'refresh-token',
      },
    );

    const auditCreateInput = firstMockArgument(tx.userSecurityAuditLog.create);
    expect(auditCreateInput).toMatchObject({
      data: {
        oldValueEncrypted:
          'encrypted:{"kind":"email","email":"old@example.com"}',
        newValueEncrypted:
          'encrypted:{"kind":"email","email":"new@example.com"}',
        oldValueMasked: 'ol***@example.com',
        newValueMasked: 'ne***@example.com',
        deviceId: 'device-1',
      },
    });
    const outboxCreateInput = firstMockArgument(
      tx.securityNotificationOutbox.createMany,
    );
    expect(outboxCreateInput).toMatchObject({
      data: [{ recipient: 'OLD' }, { recipient: 'NEW' }],
    });
    const revokeInput = firstMockArgument(tx.refreshToken.updateMany);
    expect(revokeInput).toMatchObject({
      where: { id: { not: 'session-current' } },
    });
    expect(result).toMatchObject({
      revokedSessionsCount: 2,
      currentSessionPreserved: true,
      security: { email: 'new@example.com' },
    });
  });
});
