import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { TokenBlacklistService } from './token-blacklist.service';
import { RedisService } from '@/redis/redis.service';
import { jwtConfig } from '@/configs/jwt.config';
import { TokenBlacklistScope } from '@/auth/types/jwt.types';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let jwtDecode: jest.Mock;
  let redisClient: { set: jest.Mock; get: jest.Mock; exists: jest.Mock };
  let isReady: jest.Mock;

  const NOW_MS = 1_000_000_000_000;
  const USER_ID = 'user-1';
  const USER_KEY = `jwt:user_revoked_before:${USER_ID}`;

  const buildService = async () => {
    jwtDecode = jest.fn<unknown, [string]>();
    redisClient = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      exists: jest.fn().mockResolvedValue(0),
    };
    isReady = jest.fn().mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        { provide: JwtService, useValue: { decode: jwtDecode } },
        {
          provide: RedisService,
          useValue: { isReady, getClient: () => redisClient },
        },
        { provide: jwtConfig.KEY, useValue: { accessExpiresIn: '15m' } },
      ],
    }).compile();

    service = module.get(TokenBlacklistService);
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW_MS);
    await buildService();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('setUserRevokedBefore', () => {
    it('Redis 可用时写入带 TTL 的撤销时间戳（TTL 与 access token 生命周期对齐）', async () => {
      await service.setUserRevokedBefore(USER_ID);

      expect(redisClient.set).toHaveBeenCalledWith(
        USER_KEY,
        String(NOW_MS),
        'EX',
        900,
      );
    });

    it('Redis set 失败时显式失败（fail-closed），返回 added=false', async () => {
      redisClient.set.mockRejectedValue(new Error('boom'));

      const { added } = await service.setUserRevokedBefore(USER_ID);

      expect(added).toBe(false);
    });

    it('Redis 不可用时显式失败，不调用 Redis', async () => {
      isReady.mockReturnValue(false);

      const { added } = await service.setUserRevokedBefore(USER_ID);

      expect(added).toBe(false);
      expect(redisClient.set).not.toHaveBeenCalled();
    });
  });

  describe('isUserRevokedBefore', () => {
    it('无撤销标记时放行', async () => {
      expect(
        await service.isUserRevokedBefore(USER_ID, NOW_MS / 1000 - 10),
      ).toBe(false);
    });

    it('撤销时间点之前签发的 token 被拒', async () => {
      redisClient.get.mockResolvedValue(String(NOW_MS - 1000));

      expect(
        await service.isUserRevokedBefore(USER_ID, NOW_MS / 1000 - 2),
      ).toBe(true);
    });

    it('撤销时间点之后签发的 token 放行', async () => {
      redisClient.get.mockResolvedValue(String(NOW_MS - 1000));

      expect(
        await service.isUserRevokedBefore(USER_ID, NOW_MS / 1000 + 2),
      ).toBe(false);
    });

    it('同一秒内先签发后撤销的 token 也被拒（fail-closed）', async () => {
      redisClient.get.mockResolvedValue(String(NOW_MS));

      expect(await service.isUserRevokedBefore(USER_ID, NOW_MS / 1000)).toBe(
        true,
      );
    });

    it('Redis 中的非法值被忽略', async () => {
      redisClient.get.mockResolvedValue('not-a-number');

      expect(
        await service.isUserRevokedBefore(USER_ID, NOW_MS / 1000 - 10),
      ).toBe(false);
    });

    it('Redis 读取失败时放行（读侧 fail-open，由写侧 fail-closed 兜住）', async () => {
      redisClient.get.mockRejectedValue(new Error('get failed'));

      expect(
        await service.isUserRevokedBefore(USER_ID, NOW_MS / 1000 - 10),
      ).toBe(false);
    });

    it('Redis 不可用时放行', async () => {
      isReady.mockReturnValue(false);

      expect(
        await service.isUserRevokedBefore(USER_ID, NOW_MS / 1000 - 10),
      ).toBe(false);
      expect(redisClient.get).not.toHaveBeenCalled();
    });
  });

  describe('jti 黑名单（现有行为回归）', () => {
    it('拉黑当前 token 的 jti 并可校验', async () => {
      jwtDecode.mockReturnValue({
        jti: 'j-1',
        exp: Math.floor(NOW_MS / 1000) + 600,
      });

      const result = await service.add(
        'raw-token',
        TokenBlacklistScope.AccessToken,
      );

      expect(result.added).toBe(true);
      expect(redisClient.set).toHaveBeenCalledWith(
        'jwt:blacklist:access:j-1',
        '1',
        'EX',
        600,
      );

      redisClient.exists.mockResolvedValue(1);
      expect(await service.isTokenBlacklisted('j-1')).toBe(true);
    });

    it('缺少 jti 的 token 不拉黑', async () => {
      jwtDecode.mockReturnValue({ exp: Math.floor(NOW_MS / 1000) + 600 });

      const result = await service.add('raw-token');

      expect(result.added).toBe(false);
    });
  });
});
