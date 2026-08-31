import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { AuthController } from './auth.controller';
import { REQUIRE_AUTH_KEY } from '../decorators/require-auth.decorator';

describe('AuthController API key validation', () => {
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
    expect(Reflect.getMetadata(REQUIRE_AUTH_KEY, handler)).toEqual(['api_key']);
    expect(handler()).toEqual({
      authenticated: true,
    });
  });

  it('returns a short-lived avatar URL from the profile service', async () => {
    const permService = {
      getPermByRoleCodes: jest.fn().mockResolvedValue(['profile:read']),
    };
    const userOrgService = {
      getPrimaryOrgId: jest.fn().mockResolvedValue('org-1'),
    };
    const profileService = {
      getReadableAvatarUrl: jest
        .fn()
        .mockReturnValue('https://signed.example/avatar.webp?Signature=1'),
    };
    const controller = new AuthController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      permService as never,
      userOrgService as never,
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
  });
});
