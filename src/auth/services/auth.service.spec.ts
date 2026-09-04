import { AuthService } from './auth.service';
import { AuthType } from '@/auth/enums';
import { CodeType } from '@/common/enums';

describe('AuthService', () => {
  let authService: AuthService;
  let userQueryRepo: { first: jest.Mock; byTarget: jest.Mock };
  let userCommandRepo: {
    createWithProfile: jest.Mock;
    updateLastLogin: jest.Mock;
    updatePassword: jest.Mock;
  };
  let otpService: { verifyCode: jest.Mock };
  let tokenService: {
    generateTokens: jest.Mock;
    refreshToken: jest.Mock;
    logout: jest.Mock;
  };
  let loginLogRepo: {
    countLoginFailuresByTargetSince: jest.Mock;
    countLoginFailuresByIpSince: jest.Mock;
    createLoginLog: jest.Mock;
  };
  let authMailService: {
    sendWelcomeEmail: jest.Mock;
    sendPasswordResetNotification: jest.Mock;
  };
  let permService: { getPermByRoleCodes: jest.Mock };
  let userOrgService: { getPrimaryOrgId: jest.Mock };

  beforeEach(() => {
    userQueryRepo = {
      first: jest.fn().mockResolvedValue(null),
      byTarget: jest.fn().mockResolvedValue(null),
    };
    userCommandRepo = {
      createWithProfile: jest.fn(),
      updateLastLogin: jest.fn().mockResolvedValue(undefined),
      updatePassword: jest.fn().mockResolvedValue(undefined),
    };
    otpService = {
      verifyCode: jest.fn().mockResolvedValue({ valid: true }),
    };
    tokenService = {
      generateTokens: jest.fn().mockResolvedValue({
        accessToken: 'acc',
        expiresIn: 900,
        refreshToken: 'ref',
        refreshExpiresIn: 2592000,
      }),
      refreshToken: jest.fn(),
      logout: jest.fn(),
    };
    loginLogRepo = {
      countLoginFailuresByTargetSince: jest.fn().mockResolvedValue(0),
      countLoginFailuresByIpSince: jest.fn().mockResolvedValue(0),
      createLoginLog: jest.fn().mockResolvedValue(undefined),
    };
    authMailService = {
      sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetNotification: jest.fn().mockResolvedValue(undefined),
    };
    permService = { getPermByRoleCodes: jest.fn() };
    userOrgService = { getPrimaryOrgId: jest.fn() };

    authService = new AuthService(
      userQueryRepo as never,
      userCommandRepo as never,
      otpService as never,
      tokenService as never,
      loginLogRepo as never,
      authMailService as never,
      permService as never,
      userOrgService as never,
    );
  });

  describe('register', () => {
    it('registers user and attaches primary organization id', async () => {
      userCommandRepo.createWithProfile.mockResolvedValue({
        id: 'u1',
        username: 'test',
        email: 'test@example.com',
        phone: null,
        countryCode: null,
        profile: { name: 'Test' },
        roles: [{ role: { code: 'USER' } }],
        createdAt: new Date(),
      });
      userOrgService.getPrimaryOrgId.mockResolvedValue('org-1');

      const result = await authService.register(
        {
          type: AuthType.EMAIL_CODE,
          email: 'test@example.com',
          code: '123456',
        } as never,
        '127.0.0.1',
        'agent',
      );

      expect(otpService.verifyCode).toHaveBeenCalledWith(
        'test@example.com',
        '123456',
        CodeType.REGISTER,
      );
      expect(userCommandRepo.createWithProfile).toHaveBeenCalled();
      expect(userOrgService.getPrimaryOrgId).toHaveBeenCalledWith('u1');
      expect(result.user.currentOrgId).toBe('org-1');
      expect(result.accessToken).toBe('acc');
    });
  });

  describe('login', () => {
    it('logs in user via email code and attaches primary organization id', async () => {
      userQueryRepo.byTarget.mockResolvedValue({
        id: 'u2',
        email: 'u2@example.com',
        passwordHash: null,
        profile: { name: 'User 2' },
        roles: [{ role: { code: 'USER' } }],
        createdAt: new Date(),
      });
      userOrgService.getPrimaryOrgId.mockResolvedValue('org-2');

      const result = await authService.login(
        {
          type: AuthType.EMAIL_CODE,
          email: 'u2@example.com',
          code: '654321',
        } as never,
        '127.0.0.1',
        'agent',
      );

      expect(otpService.verifyCode).toHaveBeenCalledWith(
        'u2@example.com',
        '654321',
        CodeType.LOGIN,
      );
      expect(userCommandRepo.updateLastLogin).toHaveBeenCalledWith(
        'u2',
        expect.any(Date),
      );
      expect(result.user.currentOrgId).toBe('org-2');
      expect(result.accessToken).toBe('acc');
    });
  });

  describe('resetPassword', () => {
    it('verifies code, hashes new password and updates password', async () => {
      userQueryRepo.byTarget.mockResolvedValue({
        id: 'u3',
        email: 'u3@example.com',
        profile: { name: 'User 3' },
      });

      const result = await authService.resetPassword(
        {
          target: 'u3@example.com',
          code: '1234',
          newPassword: 'Password123',
        },
        '127.0.0.1',
        'agent',
      );

      expect(otpService.verifyCode).toHaveBeenCalledWith(
        'u3@example.com',
        '1234',
        CodeType.RESET_PASSWORD,
      );
      expect(userCommandRepo.updatePassword).toHaveBeenCalledWith(
        'u3',
        expect.any(String),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('refreshToken', () => {
    it('delegates to tokenService', async () => {
      tokenService.refreshToken.mockResolvedValue({
        accessToken: 'new-acc',
        expiresIn: 900,
        refreshToken: 'new-ref',
        refreshExpiresIn: 2592000,
      });

      const result = await authService.refreshToken(
        'rt-1',
        { deviceId: 'dev-1', deviceInfo: 'iOS' } as never,
        '127.0.0.1',
        'agent',
      );

      expect(tokenService.refreshToken).toHaveBeenCalledWith('rt-1', {
        ip: '127.0.0.1',
        userAgent: 'agent',
        deviceId: 'dev-1',
        deviceInfo: 'iOS',
      });
      expect(result.accessToken).toBe('new-acc');
    });
  });

  describe('logout', () => {
    it('delegates to tokenService and returns logout result', async () => {
      tokenService.logout.mockResolvedValue({
        accessTokenRevoked: true,
        refreshTokenRevoked: true,
        message: '登出成功',
      });

      const result = await authService.logout('u1', 'token-1', {
        ip: '127.0.0.1',
      });

      expect(tokenService.logout).toHaveBeenCalledWith('u1', 'token-1', {
        ip: '127.0.0.1',
      });
      expect(result.accessTokenRevoked).toBe(true);
      expect(result.refreshTokenRevoked).toBe(true);
      expect(result.message).toBe('登出成功');
    });
  });

  describe('getPermissionsByRoles', () => {
    it('resolves permissions from permService', async () => {
      permService.getPermByRoleCodes.mockResolvedValue(['user:read']);

      const perms = await authService.getPermissionsByRoles(['USER']);
      expect(perms).toEqual(['user:read']);
    });

    it('returns empty array when permService throws', async () => {
      permService.getPermByRoleCodes.mockRejectedValue(new Error('db error'));

      const perms = await authService.getPermissionsByRoles(['USER']);
      expect(perms).toEqual([]);
    });
  });

  describe('resolveCurrentOrgId', () => {
    it('returns undefined when userOrgService throws', async () => {
      userOrgService.getPrimaryOrgId.mockRejectedValue(new Error('no org'));

      const orgId = await authService.resolveCurrentOrgId('u1');
      expect(orgId).toBeUndefined();
    });
  });
});
