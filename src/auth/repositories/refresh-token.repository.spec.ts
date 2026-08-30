import { Test, TestingModule } from '@nestjs/testing';
import { RefreshTokenRepository } from './refresh-token.repository';
import { PrismaService } from '@/prisma/prisma.service';

const FIXED_NOW = 1_700_000_000_000;

interface FindManyArgs {
  where: {
    userId: string;
    deviceId?: string;
    jti: { not: null };
    OR: Array<{ revokedAt: null | { gt: Date } }>;
  };
  select: { jti: boolean; createdAt: boolean };
}

describe('RefreshTokenRepository.findActiveAccessJtis', () => {
  let repository: RefreshTokenRepository;
  let prisma: {
    refreshToken: { findMany: jest.Mock<Promise<unknown>, [FindManyArgs]> };
  };

  beforeEach(async () => {
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);

    prisma = {
      refreshToken: {
        findMany: jest.fn() as jest.Mock<Promise<unknown>, [FindManyArgs]>,
      },
    };
    prisma.refreshToken.findMany.mockResolvedValue([]);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = moduleRef.get(RefreshTokenRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('enumerates unrevoked rows and rows revoked within the access window', async () => {
    await repository.findActiveAccessJtis('user-1', 900_000);

    expect(prisma.refreshToken.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        jti: { not: null },
        OR: [
          { revokedAt: null },
          { revokedAt: { gt: new Date(FIXED_NOW - 900_000) } },
        ],
      },
      select: { jti: true, createdAt: true },
    });
  });

  it('scopes the enumeration to a device when provided', async () => {
    await repository.findActiveAccessJtis('user-1', 900_000, 'device-9');

    const args = prisma.refreshToken.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({
      userId: 'user-1',
      deviceId: 'device-9',
    });
  });

  it('returns the selected jti and createdAt pairs', async () => {
    const rows = [{ jti: 'jti-a', createdAt: new Date(FIXED_NOW) }];
    prisma.refreshToken.findMany.mockResolvedValue(rows);

    const result = await repository.findActiveAccessJtis('user-1', 900_000);

    expect(result).toBe(rows);
  });
});
