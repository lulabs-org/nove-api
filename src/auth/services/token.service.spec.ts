import { TokenService } from './token.service';
import { TokenBlacklistScope } from '@/auth/types/jwt.types';

describe('TokenService', () => {
  let tokenService: TokenService;
  let jwtService: { sign: jest.Mock; decode: jest.Mock; verify: jest.Mock };
  let userRepo: { byId: jest.Mock };
  let refreshTokenRepo: {
    createToken: jest.Mock;
    findTokenByHash: jest.Mock;
    revokeToken: jest.Mock;
    revokeTokensByDeviceId: jest.Mock;
    revokeAllTokensByUserId: jest.Mock;
  };
  let tokenBlacklist: {
    add: jest.Mock;
    setUserRevokedBefore: jest.Mock;
  };
  const mockConfig = {
    accessSecret: 'access-secret-test',
    accessExpiresIn: '15m',
    refreshExpiresIn: '30d',
    refreshSecret: 'refresh-secret-test',
  };

  beforeEach(() => {
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      decode: jest.fn(),
      verify: jest.fn(),
    };
    userRepo = {
      byId: jest.fn(),
    };
    refreshTokenRepo = {
      createToken: jest.fn(),
      findTokenByHash: jest.fn(),
      revokeToken: jest.fn(),
      revokeTokensByDeviceId: jest.fn(),
      revokeAllTokensByUserId: jest.fn(),
    };
    tokenBlacklist = {
      add: jest.fn().mockResolvedValue({ added: true, jti: 'mock-jti' }),
      setUserRevokedBefore: jest.fn().mockResolvedValue({ added: true }),
    };

    tokenService = new TokenService(
      jwtService as never,
      userRepo as never,
      refreshTokenRepo as never,
      mockConfig as never,
      tokenBlacklist as never,
    );
  });

  describe('logout', () => {
    it('revokes single access token by adding to blacklist in default logout', async () => {
      const result = await tokenService.logout('user-1', 'access-token-123');

      expect(tokenBlacklist.add).toHaveBeenCalledWith(
        'access-token-123',
        TokenBlacklistScope.AccessToken,
      );
      expect(result.accessTokenRevoked).toBe(true);
      expect(result.refreshTokenRevoked).toBe(false);
      expect(result.message).toBe('退出登录成功');
      expect(refreshTokenRepo.revokeAllTokensByUserId).not.toHaveBeenCalled();
      expect(tokenBlacklist.setUserRevokedBefore).not.toHaveBeenCalled();
    });

    it('revokes refresh token when refreshToken option is provided', async () => {
      refreshTokenRepo.revokeToken.mockResolvedValue({ id: 'rt-1' });

      const result = await tokenService.logout('user-1', 'access-token-123', {
        refreshToken: 'refresh-token-456',
      });

      expect(tokenBlacklist.add).toHaveBeenCalledWith(
        'access-token-123',
        TokenBlacklistScope.AccessToken,
      );
      expect(refreshTokenRepo.revokeToken).toHaveBeenCalledWith(
        'refresh-token-456',
      );
      expect(result.accessTokenRevoked).toBe(true);
      expect(result.refreshTokenRevoked).toBe(true);
      expect(result.revokedTokensCount).toBe(1);
      expect(result.message).toContain('已撤销当前设备的 1 个令牌');
    });

    it('gracefully handles refresh token revocation failure', async () => {
      refreshTokenRepo.revokeToken.mockRejectedValue(new Error('DB error'));

      const result = await tokenService.logout('user-1', 'access-token-123', {
        refreshToken: 'invalid-token',
      });

      expect(result.accessTokenRevoked).toBe(true);
      expect(result.refreshTokenRevoked).toBe(false);
      expect(result.message).toBe('退出登录成功');
    });

    it('revokes tokens by deviceId when deviceId option is provided', async () => {
      refreshTokenRepo.revokeTokensByDeviceId.mockResolvedValue(2);

      const result = await tokenService.logout('user-1', 'access-token-123', {
        deviceId: 'device-abc',
      });

      expect(refreshTokenRepo.revokeTokensByDeviceId).toHaveBeenCalledWith(
        'user-1',
        'device-abc',
      );
      expect(result.revokedTokensCount).toBe(2);
      expect(result.message).toContain('已撤销当前设备的 2 个令牌');
    });

    it('handles revokeAllDevices: skips single token jti blacklist and sets user revocation marker', async () => {
      refreshTokenRepo.revokeAllTokensByUserId.mockResolvedValue(5);
      tokenBlacklist.setUserRevokedBefore.mockResolvedValue({ added: true });

      const result = await tokenService.logout('user-1', 'access-token-123', {
        revokeAllDevices: true,
      });

      // Crucial requirement: single token is not added to blacklist directly so retry is possible
      expect(tokenBlacklist.add).not.toHaveBeenCalled();
      expect(refreshTokenRepo.revokeAllTokensByUserId).toHaveBeenCalledWith(
        'user-1',
      );
      expect(tokenBlacklist.setUserRevokedBefore).toHaveBeenCalledWith(
        'user-1',
      );
      expect(result.accessTokenRevoked).toBe(true);
      expect(result.allDevicesLoggedOut).toBe(true);
      expect(result.allAccessTokensRevoked).toBe(true);
      expect(result.revokedTokensCount).toBe(5);
      expect(result.message).toContain('已撤销所有设备的 5 个令牌');
    });

    it('handles revokeAllDevices failure when user revocation marker cannot be written', async () => {
      refreshTokenRepo.revokeAllTokensByUserId.mockResolvedValue(3);
      tokenBlacklist.setUserRevokedBefore.mockResolvedValue({ added: false });

      const result = await tokenService.logout('user-1', 'access-token-123', {
        revokeAllDevices: true,
      });

      expect(result.revokedTokensCount).toBe(3);
      expect(result.allDevicesLoggedOut).toBeUndefined();
      expect(result.message).toContain('退出登录未完全成功');
    });

    it('catches unexpected error and returns failed LogoutResult', async () => {
      refreshTokenRepo.revokeAllTokensByUserId.mockRejectedValue(
        new Error('Unexpected DB crash'),
      );

      const result = await tokenService.logout('user-1', 'access-token-123', {
        revokeAllDevices: true,
      });

      expect(result.accessTokenRevoked).toBe(false);
      expect(result.refreshTokenRevoked).toBe(false);
      expect(result.message).toBe('退出登录失败');
    });
  });
});
