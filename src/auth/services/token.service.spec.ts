import { JwtService } from '@nestjs/jwt';
import { ConfigType } from '@nestjs/config';

import { jwtConfig } from '@/configs/jwt.config';
import { UserQueryRepository } from '@/user/repositories/user-query.repository';
import { UserCommandRepository } from '@/user/repositories/user-command.repository';
import { RefreshTokenRepository } from '@/auth/repositories/refresh-token.repository';
import { TokenBlacklistService } from './token-blacklist.service';
import { TokenService } from './token.service';

describe('TokenService (token version)', () => {
  const jwtService = {
    sign: jest.fn().mockReturnValue('signed-access-token'),
    decode: jest.fn(),
  };
  const userRepo = { byId: jest.fn() };
  const userCommandRepo = { incrementTokenVersion: jest.fn() };
  const refreshTokenRepo = {
    createRefreshToken: jest.fn(),
    findByToken: jest.fn(),
    revokeToken: jest.fn(),
    revokeAllTokensByUserId: jest.fn(),
    revokeTokensByDeviceId: jest.fn(),
  };
  const tokenBlacklist = { add: jest.fn() };
  const service = new TokenService(
    jwtService as unknown as JwtService,
    userRepo as unknown as UserQueryRepository,
    userCommandRepo as unknown as UserCommandRepository,
    refreshTokenRepo as unknown as RefreshTokenRepository,
    {
      accessSecret: 'test-secret',
      accessExpiresIn: '15m',
      refreshExpiresIn: '7d',
    } as ConfigType<typeof jwtConfig>,
    tokenBlacklist as unknown as TokenBlacklistService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jwtService.sign.mockReturnValue('signed-access-token');
    jwtService.decode.mockReturnValue({
      jti: 'jti-1',
      exp: Math.floor(Date.now() / 1000) + 900,
    });
    tokenBlacklist.add.mockResolvedValue({ jti: 'jti-1', added: true });
  });

  it('generateTokens signs the access token with the current token version', async () => {
    userRepo.byId.mockResolvedValue({ id: 'user-1', tokenVersion: 3 });
    refreshTokenRepo.createRefreshToken.mockResolvedValue({});

    await service.generateTokens('user-1');

    expect(jwtService.sign).toHaveBeenCalledWith(
      { sub: 'user-1', token_version: 3 },
      expect.objectContaining({ secret: 'test-secret' }),
    );
  });

  it('refreshToken signs the access token with the current token version', async () => {
    refreshTokenRepo.findByToken.mockResolvedValue({
      userId: 'user-1',
      revokedAt: null,
    });
    userRepo.byId.mockResolvedValue({ id: 'user-1', tokenVersion: 5 });
    refreshTokenRepo.createRefreshToken.mockResolvedValue({});
    refreshTokenRepo.revokeToken.mockResolvedValue({});

    await service.refreshToken('old-refresh-token');

    expect(jwtService.sign).toHaveBeenCalledWith(
      { sub: 'user-1', token_version: 5 },
      expect.objectContaining({ secret: 'test-secret' }),
    );
  });

  it('logout with revokeAllDevices increments the token version to invalidate all access tokens', async () => {
    refreshTokenRepo.revokeAllTokensByUserId.mockResolvedValue(4);
    userCommandRepo.incrementTokenVersion.mockResolvedValue({});

    const result = await service.logout('user-1', 'access-token', {
      revokeAllDevices: true,
    });

    expect(refreshTokenRepo.revokeAllTokensByUserId).toHaveBeenCalledWith(
      'user-1',
    );
    expect(userCommandRepo.incrementTokenVersion).toHaveBeenCalledWith('user-1');
    expect(result.allDevicesLoggedOut).toBe(true);
    expect(result.revokedTokensCount).toBe(4);
  });

  it('logout scoped to a device does not increment the token version', async () => {
    refreshTokenRepo.revokeTokensByDeviceId.mockResolvedValue(2);

    await service.logout('user-1', 'access-token', { deviceId: 'device-1' });

    expect(refreshTokenRepo.revokeTokensByDeviceId).toHaveBeenCalledWith(
      'user-1',
      'device-1',
    );
    expect(userCommandRepo.incrementTokenVersion).not.toHaveBeenCalled();
  });

  it('logout of the current session only does not increment the token version', async () => {
    refreshTokenRepo.revokeToken.mockResolvedValue({});

    await service.logout('user-1', 'access-token', {
      refreshToken: 'refresh-token',
    });

    expect(refreshTokenRepo.revokeToken).toHaveBeenCalledWith('refresh-token');
    expect(userCommandRepo.incrementTokenVersion).not.toHaveBeenCalled();
  });
});
