import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { TokenBlacklistService } from './token-blacklist.service';
import { RedisService } from '@/redis/redis.service';
import { TokenBlacklistScope } from '@/auth/types/jwt.types';

const FIXED_NOW = 1_700_000_000_000;

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let jwtService: { decode: jest.Mock };
  let redis: { isReady: jest.Mock; getClient: jest.Mock };
  let redisClient: { set: jest.Mock; exists: jest.Mock };

  beforeEach(async () => {
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);

    jwtService = { decode: jest.fn() };
    redisClient = { set: jest.fn(), exists: jest.fn() };
    redis = {
      isReady: jest.fn().mockReturnValue(true),
      getClient: jest.fn().mockReturnValue(redisClient),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        { provide: JwtService, useValue: jwtService },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = moduleRef.get(TokenBlacklistService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('addByJti', () => {
    it('writes a redis entry with ttl derived from expiry', async () => {
      const expiresAtMs = FIXED_NOW + 90_000;

      const added = await service.addByJti('jti-1', expiresAtMs);

      expect(added).toBe(true);
      expect(redisClient.set).toHaveBeenCalledWith(
        'jwt:blacklist:access:jti-1',
        '1',
        'EX',
        90,
      );
    });

    it('skips already expired jtis', async () => {
      const added = await service.addByJti('jti-1', FIXED_NOW - 1);

      expect(added).toBe(false);
      expect(redisClient.set).not.toHaveBeenCalled();
    });

    it('falls back to the in-memory map when redis is unavailable', async () => {
      redis.isReady.mockReturnValue(false);

      const added = await service.addByJti('jti-1', FIXED_NOW + 90_000);

      expect(added).toBe(true);
      expect(await service.isTokenBlacklisted('jti-1')).toBe(true);
    });
  });

  describe('add', () => {
    it('blacklists a decoded token by jti', async () => {
      jwtService.decode.mockReturnValue({
        jti: 'jti-token',
        exp: (FIXED_NOW + 60_000) / 1000,
      });

      const result = await service.add('raw-token');

      expect(result).toEqual({ jti: 'jti-token', added: true });
      expect(redisClient.set).toHaveBeenCalledWith(
        'jwt:blacklist:access:jti-token',
        '1',
        'EX',
        60,
      );
    });

    it('rejects tokens without jti or exp', async () => {
      jwtService.decode.mockReturnValue({ sub: 'user-1' });

      const result = await service.add('raw-token');

      expect(result).toEqual({ added: false });
      expect(redisClient.set).not.toHaveBeenCalled();
    });

    it('falls back to the in-memory map when redis set fails', async () => {
      jwtService.decode.mockReturnValue({
        jti: 'jti-token',
        exp: (FIXED_NOW + 60_000) / 1000,
      });
      // 故障形态：redis 读写一并不可用
      redisClient.set.mockRejectedValue(new Error('redis down'));
      redisClient.exists.mockRejectedValue(new Error('redis down'));

      const result = await service.add('raw-token');

      expect(result.added).toBe(true);
      expect(await service.isTokenBlacklisted('jti-token')).toBe(true);
    });
  });

  describe('isTokenBlacklisted', () => {
    it('checks redis first', async () => {
      redisClient.exists.mockResolvedValue(1);

      expect(await service.isTokenBlacklisted('jti-1')).toBe(true);
      expect(redisClient.exists).toHaveBeenCalledWith(
        'jwt:blacklist:access:jti-1',
      );
    });

    it('honors a custom scope', async () => {
      redisClient.exists.mockResolvedValue(1);

      await service.isTokenBlacklisted(
        'jti-1',
        TokenBlacklistScope.RefreshToken,
      );

      expect(redisClient.exists).toHaveBeenCalledWith(
        'jwt:blacklist:refresh:jti-1',
      );
    });
  });
});
