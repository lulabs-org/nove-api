import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let registerService: { register: jest.Mock };
  let loginService: { login: jest.Mock };
  let passwordService: { resetPassword: jest.Mock };
  let tokenService: { refreshToken: jest.Mock; logout: jest.Mock };
  let tokenBlacklist: { add: jest.Mock };
  let permService: { getPermByRoleCodes: jest.Mock };
  let userOrgService: { getPrimaryOrgId: jest.Mock };

  beforeEach(() => {
    registerService = { register: jest.fn() };
    loginService = { login: jest.fn() };
    passwordService = { resetPassword: jest.fn() };
    tokenService = { refreshToken: jest.fn(), logout: jest.fn() };
    tokenBlacklist = { add: jest.fn() };
    permService = { getPermByRoleCodes: jest.fn() };
    userOrgService = { getPrimaryOrgId: jest.fn() };

    authService = new AuthService(
      registerService as never,
      loginService as never,
      passwordService as never,
      tokenService as never,
      tokenBlacklist as never,
      permService as never,
      userOrgService as never,
    );
  });

  describe('register', () => {
    it('registers user and attaches primary organization id', async () => {
      registerService.register.mockResolvedValue({
        accessToken: 'acc',
        expiresIn: 3600,
        user: { id: 'u1', name: 'User 1' },
      });
      userOrgService.getPrimaryOrgId.mockResolvedValue('org-1');

      const result = await authService.register(
        { username: 'test' } as never,
        '127.0.0.1',
        'agent',
      );

      expect(registerService.register).toHaveBeenCalledWith(
        { username: 'test' },
        '127.0.0.1',
        'agent',
      );
      expect(userOrgService.getPrimaryOrgId).toHaveBeenCalledWith('u1');
      expect(result.user.currentOrgId).toBe('org-1');
    });
  });

  describe('login', () => {
    it('logs in user and attaches primary organization id', async () => {
      loginService.login.mockResolvedValue({
        accessToken: 'acc',
        expiresIn: 3600,
        user: { id: 'u2', name: 'User 2' },
      });
      userOrgService.getPrimaryOrgId.mockResolvedValue('org-2');

      const result = await authService.login(
        { username: 'test' } as never,
        '127.0.0.1',
        'agent',
      );

      expect(loginService.login).toHaveBeenCalledWith(
        { username: 'test' },
        '127.0.0.1',
        'agent',
      );
      expect(result.user.currentOrgId).toBe('org-2');
    });
  });

  describe('resetPassword', () => {
    it('delegates to passwordService', async () => {
      passwordService.resetPassword.mockResolvedValue({
        success: true,
        message: 'ok',
      });

      const result = await authService.resetPassword(
        {} as never,
        '127.0.0.1',
        'agent',
      );

      expect(passwordService.resetPassword).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('refreshToken', () => {
    it('delegates to tokenService', async () => {
      tokenService.refreshToken.mockResolvedValue({
        accessToken: 'new-acc',
        expiresIn: 900,
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
    });

    it('falls back to tokenBlacklist when tokenService.logout throws', async () => {
      tokenService.logout.mockRejectedValue(
        new Error('Redis connection failed'),
      );
      tokenBlacklist.add.mockResolvedValue({ added: true });

      const result = await authService.logout('u1', 'token-1');

      expect(tokenBlacklist.add).toHaveBeenCalledWith('token-1');
      expect(result.accessTokenRevoked).toBe(true);
      expect(result.refreshTokenRevoked).toBe(false);
      expect(result.message).toContain('退出登录部分成功');
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
