import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { TokenService } from './token.service';
import { jwtConfig } from '@/configs/jwt.config';
import { UserQueryRepository } from '@/user/repositories/user-query.repository';
import { RefreshTokenRepository } from '@/auth/repositories/refresh-token.repository';
import { TokenBlacklistService } from './token-blacklist.service';
import { TokenBlacklistScope } from '@/auth/types/jwt.types';

const FIXED_NOW = 1_700_000_000_000;
const WINDOW_MS = 900_000; // 15m
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: {
    sign: jest.Mock<string, [Record<string, unknown>, { jwtid: string }]>;
  };
  let userRepo: { byId: jest.Mock };
  let refreshTokenRepo: {
    createRefreshToken: jest.Mock;
    findByToken: jest.Mock;
    revokeToken: jest.Mock;
    revokeAllTokensByUserId: jest.Mock;
    revokeTokensByDeviceId: jest.Mock;
    findActiveAccessJtis: jest.Mock;
  };
  let tokenBlacklist: { add: jest.Mock; addByJti: jest.Mock };

  beforeEach(async () => {
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);

    jwtService = {
      sign: jest.fn() as jest.Mock<
        string,
        [Record<string, unknown>, { jwtid: string }]
      >,
    };
    userRepo = { byId: jest.fn() };
    refreshTokenRepo = {
      createRefreshToken: jest.fn(),
      findByToken: jest.fn(),
      revokeToken: jest.fn(),
      revokeAllTokensByUserId: jest.fn(),
      revokeTokensByDeviceId: jest.fn(),
      findActiveAccessJtis: jest.fn(),
    };
    tokenBlacklist = { add: jest.fn(), addByJti: jest.fn() };

    jwtService.sign.mockImplementation(
      (_payload, opts) => `token-${opts.jwtid}`,
    );
    tokenBlacklist.add.mockResolvedValue({ jti: 'current', added: true });
    tokenBlacklist.addByJti.mockResolvedValue(true);
    refreshTokenRepo.createRefreshToken.mockResolvedValue({});
    refreshTokenRepo.revokeToken.mockResolvedValue({});

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: jwtService },
        { provide: UserQueryRepository, useValue: userRepo },
        { provide: RefreshTokenRepository, useValue: refreshTokenRepo },
        {
          provide: jwtConfig.KEY,
          useValue: {
            accessSecret: 'test-access-secret',
            accessExpiresIn: '15m',
            refreshExpiresIn: '30d',
          },
        },
        { provide: TokenBlacklistService, useValue: tokenBlacklist },
      ],
    }).compile();

    service = moduleRef.get(TokenService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateTokens', () => {
    it('registers the access token jti on the refresh token row', async () => {
      await service.generateTokens('user-1');

      const signOpts = jwtService.sign.mock.calls[0][1];
      expect(signOpts.jwtid).toMatch(UUID_RE);
      expect(refreshTokenRepo.createRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          jti: signOpts.jwtid,
        }),
      );
    });
  });

  describe('refreshToken', () => {
    it('registers the rotated access token jti and revokes the old token', async () => {
      refreshTokenRepo.findByToken.mockResolvedValue({
        id: 'row-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(FIXED_NOW + 60_000),
      });
      userRepo.byId.mockResolvedValue({ id: 'user-1' });

      await service.refreshToken('old-refresh');

      const signOpts = jwtService.sign.mock.calls[0][1];
      expect(signOpts.jwtid).toMatch(UUID_RE);
      expect(refreshTokenRepo.createRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          jti: signOpts.jwtid,
        }),
      );
      expect(refreshTokenRepo.revokeToken).toHaveBeenCalledWith('old-refresh');
    });

    it('rejects unknown refresh tokens', async () => {
      refreshTokenRepo.findByToken.mockResolvedValue(null);

      await expect(service.refreshToken('missing')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('blacklists the current access token', async () => {
      await service.logout('user-1', 'current-access-token');

      expect(tokenBlacklist.add).toHaveBeenCalledWith(
        'current-access-token',
        TokenBlacklistScope.AccessToken,
      );
    });

    it('revokes refresh tokens first, then blacklists all active access jtis (revokeAllDevices)', async () => {
      refreshTokenRepo.revokeAllTokensByUserId.mockResolvedValue(3);
      refreshTokenRepo.findActiveAccessJtis.mockResolvedValue([
        { jti: 'jti-a', createdAt: new Date(FIXED_NOW - 60_000) },
        { jti: 'jti-b', createdAt: new Date(FIXED_NOW - 300_000) },
      ]);

      const result = await service.logout('user-1', 'current-access-token', {
        revokeAllDevices: true,
      });

      expect(refreshTokenRepo.revokeAllTokensByUserId).toHaveBeenCalledWith(
        'user-1',
      );
      expect(refreshTokenRepo.findActiveAccessJtis).toHaveBeenCalledWith(
        'user-1',
        WINDOW_MS,
        undefined,
      );
      // 顺序纪律：先封死新签发，再枚举拉黑
      expect(
        refreshTokenRepo.revokeAllTokensByUserId.mock.invocationCallOrder[0],
      ).toBeLessThan(
        refreshTokenRepo.findActiveAccessJtis.mock.invocationCallOrder[0],
      );
      expect(tokenBlacklist.addByJti).toHaveBeenCalledTimes(2);
      expect(tokenBlacklist.addByJti).toHaveBeenNthCalledWith(
        1,
        'jti-a',
        FIXED_NOW - 60_000 + WINDOW_MS,
      );
      expect(tokenBlacklist.addByJti).toHaveBeenNthCalledWith(
        2,
        'jti-b',
        FIXED_NOW - 300_000 + WINDOW_MS,
      );
      expect(result.allDevicesLoggedOut).toBe(true);
      expect(result.revokedTokensCount).toBe(3);
    });

    it('blacklists only the target device access jtis (deviceId)', async () => {
      refreshTokenRepo.revokeTokensByDeviceId.mockResolvedValue(1);
      refreshTokenRepo.findActiveAccessJtis.mockResolvedValue([
        { jti: 'jti-device', createdAt: new Date(FIXED_NOW) },
      ]);

      const result = await service.logout('user-1', 'current-access-token', {
        deviceId: 'device-9',
      });

      expect(refreshTokenRepo.revokeTokensByDeviceId).toHaveBeenCalledWith(
        'user-1',
        'device-9',
      );
      expect(refreshTokenRepo.findActiveAccessJtis).toHaveBeenCalledWith(
        'user-1',
        WINDOW_MS,
        'device-9',
      );
      expect(tokenBlacklist.addByJti).toHaveBeenCalledWith(
        'jti-device',
        FIXED_NOW + WINDOW_MS,
      );
      expect(result.revokedTokensCount).toBe(1);
    });

    it('does not enumerate jtis on plain single-device logout', async () => {
      refreshTokenRepo.revokeToken.mockResolvedValue({ revokedAt: new Date() });

      await service.logout('user-1', 'current-access-token', {
        refreshToken: 'r-1',
      });

      expect(refreshTokenRepo.findActiveAccessJtis).not.toHaveBeenCalled();
      expect(refreshTokenRepo.revokeAllTokensByUserId).not.toHaveBeenCalled();
      expect(refreshTokenRepo.revokeTokensByDeviceId).not.toHaveBeenCalled();
    });

    it('keeps logout succeeding when jti enumeration fails', async () => {
      refreshTokenRepo.revokeAllTokensByUserId.mockResolvedValue(2);
      refreshTokenRepo.findActiveAccessJtis.mockRejectedValue(
        new Error('db down'),
      );

      const result = await service.logout('user-1', 'current-access-token', {
        revokeAllDevices: true,
      });

      expect(result.allDevicesLoggedOut).toBe(true);
      expect(result.message).toContain('退出登录成功');
    });
  });
});
