import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Response } from 'express';
import { AuthController } from './auth.controller';
import { REQUIRE_AUTH_KEY } from '../decorators/require-auth.decorator';
import { ClientType } from '../types/jwt.types';

describe('AuthController', () => {
  describe('API key validation', () => {
    it('exposes an API-key-only validation endpoint', () => {
      const descriptor = Object.getOwnPropertyDescriptor(
        AuthController.prototype,
        'validateApiKey',
      );
      const handler = descriptor?.value as () => { authenticated: true };

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(
        'api-key/validate',
      );
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
        RequestMethod.GET,
      );
      expect(Reflect.getMetadata(REQUIRE_AUTH_KEY, handler)).toEqual([
        'api_key',
      ]);
      expect(handler()).toEqual({
        authenticated: true,
      });
    });
  });

  describe('getMe', () => {
    it('returns a short-lived avatar URL from the profile service', async () => {
      const authService = {
        getPermissionsByRoles: jest.fn().mockResolvedValue(['profile:read']),
        resolveCurrentOrgId: jest.fn().mockResolvedValue('org-1'),
      };
      const profileService = {
        getReadableAvatarUrl: jest
          .fn()
          .mockReturnValue('https://signed.example/avatar.webp?Signature=1'),
      };
      const controller = new AuthController(
        authService as never,
        profileService as never,
      );
      const createdAt = new Date('2026-01-01T00:00:00.000Z');

      const result = await controller.getMe({
        id: 'user-1',
        username: 'tester',
        email: 'tester@example.com',
        phone: undefined,
        countryCode: undefined,
        profile: {
          displayName: '测试用户',
          avatar: 'https://bucket.example/avatars/user-1/avatar.webp',
        },
        roles: ['USER'],
        active: true,
        emailVerified: true,
        phoneVerified: false,
        createdAt,
        lastLoginAt: null,
      });

      expect(profileService.getReadableAvatarUrl).toHaveBeenCalledWith(
        'https://bucket.example/avatars/user-1/avatar.webp',
      );
      expect(result.avatar).toBe(
        'https://signed.example/avatar.webp?Signature=1',
      );
      expect(result.perm).toEqual(['profile:read']);
      expect(result.currentOrgId).toBe('org-1');
      expect(result.name).toBe('测试用户');
    });

    it('reuses authContext when provided to avoid duplicate service queries', async () => {
      const authService = {
        getPermissionsByRoles: jest.fn(),
        resolveCurrentOrgId: jest.fn(),
      };
      const profileService = {
        getReadableAvatarUrl: jest.fn().mockReturnValue(undefined),
      };
      const controller = new AuthController(
        authService as never,
        profileService as never,
      );

      const result = await controller.getMe(
        {
          id: 'user-2',
          username: 'user2',
          email: 'user2@example.com',
          roles: ['ADMIN'],
          active: true,
          emailVerified: true,
          phoneVerified: false,
          createdAt: new Date(),
        },
        {
          authMethod: 'jwt',
          userId: 'user-2',
          orgId: 'cached-org',
          permissions: ['admin:all'],
        },
      );

      expect(authService.getPermissionsByRoles).not.toHaveBeenCalled();
      expect(authService.resolveCurrentOrgId).not.toHaveBeenCalled();
      expect(result.currentOrgId).toBe('cached-org');
      expect(result.perm).toEqual(['admin:all']);
    });
  });

  describe('login & register cookie handling', () => {
    it('sets cookie for web client on login', async () => {
      const authService = {
        login: jest.fn().mockResolvedValue({
          accessToken: 'access-123',
          expiresIn: 900,
          refreshToken: 'refresh-123',
          refreshExpiresIn: 86400,
          user: { id: 'u1', name: 'User 1' },
        }),
      };
      const profileService = { getReadableAvatarUrl: jest.fn() };
      const controller = new AuthController(
        authService as never,
        profileService as never,
      );

      const cookieSpy = jest.fn();
      const res = { cookie: cookieSpy } as unknown as Response;
      const result = await controller.login(
        { clientType: ClientType.Web } as never,
        { ip: '127.0.0.1', userAgent: 'test-agent' },
        res,
      );

      expect(cookieSpy).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-123',
        expect.objectContaining({
          httpOnly: true,
          maxAge: 86400000,
        }),
      );
      expect(result).toEqual({
        accessToken: 'access-123',
        expiresIn: 900,
        user: { id: 'u1', name: 'User 1' },
      });
    });

    it('returns full payload for non-web clients on login', async () => {
      const mockResult = {
        accessToken: 'access-123',
        expiresIn: 900,
        refreshToken: 'refresh-123',
        refreshExpiresIn: 86400,
        user: { id: 'u1', name: 'User 1' },
      };
      const authService = {
        login: jest.fn().mockResolvedValue(mockResult),
      };
      const profileService = { getReadableAvatarUrl: jest.fn() };
      const controller = new AuthController(
        authService as never,
        profileService as never,
      );

      const cookieSpy = jest.fn();
      const res = { cookie: cookieSpy } as unknown as Response;
      const result = await controller.login(
        { clientType: ClientType.App } as never,
        { ip: '127.0.0.1', userAgent: 'test-agent' },
        res,
      );

      expect(cookieSpy).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('logout', () => {
    it('clears cookie for web client and revokes tokens', async () => {
      const authService = {
        logout: jest.fn().mockResolvedValue({
          accessTokenRevoked: true,
          refreshTokenRevoked: true,
          message: '退出登录成功',
        }),
      };
      const profileService = { getReadableAvatarUrl: jest.fn() };
      const controller = new AuthController(
        authService as never,
        profileService as never,
      );

      const clearCookieSpy = jest.fn();
      const res = { clearCookie: clearCookieSpy } as unknown as Response;
      const req = {
        get: jest.fn().mockReturnValue(undefined),
        cookies: { refreshToken: 'cookie-rt' },
      } as never;

      const result = await controller.logout(
        'u1',
        'bearer-token-123',
        req,
        { clientType: ClientType.Web },
        { ip: '127.0.0.1', userAgent: 'agent' },
        res,
      );

      expect(authService.logout).toHaveBeenCalledWith(
        'u1',
        'bearer-token-123',
        {
          refreshToken: 'cookie-rt',
          deviceId: undefined,
          revokeAllDevices: undefined,
          ip: '127.0.0.1',
          userAgent: 'agent',
        },
      );
      expect(clearCookieSpy).toHaveBeenCalledWith(
        'refreshToken',
        expect.any(Object),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('permissions', () => {
    it('returns permissions and resolved name', async () => {
      const authService = {
        getPermissionsByRoles: jest.fn().mockResolvedValue(['perm:read']),
      };
      const profileService = { getReadableAvatarUrl: jest.fn() };
      const controller = new AuthController(
        authService as never,
        profileService as never,
      );

      const result = await controller.getPermissions({
        id: 'u1',
        username: 'john',
        email: 'john@example.com',
        roles: ['USER'],
        active: true,
        emailVerified: true,
        phoneVerified: false,
        createdAt: new Date(),
      });

      expect(result).toEqual({
        id: 'u1',
        name: 'john',
        roles: ['USER'],
        perm: ['perm:read'],
      });
    });
  });
});
