import {
  resolveDisplayName,
  formatAuthUserResponse,
  formatAuthUserWithPermissions,
  formatPermissionsResponse,
} from './auth-user-mapper';

describe('authUserMapper', () => {
  describe('resolveDisplayName', () => {
    it('prioritizes displayName from profile', () => {
      expect(
        resolveDisplayName({
          profile: { displayName: 'Alice' },
          username: 'alice_user',
          email: 'alice@example.com',
        }),
      ).toBe('Alice');
    });

    it('falls back to username if displayName is missing', () => {
      expect(
        resolveDisplayName({
          username: 'bob_user',
          email: 'bob@example.com',
        }),
      ).toBe('bob_user');
    });

    it('falls back to email if username is missing', () => {
      expect(
        resolveDisplayName({
          email: 'charlie@example.com',
        }),
      ).toBe('charlie@example.com');
    });

    it('falls back to masked phone if email is missing', () => {
      expect(
        resolveDisplayName({
          phone: '13812345678',
        }),
      ).toBe('138****5678');
    });

    it('falls back to default fallback when all missing', () => {
      expect(resolveDisplayName({})).toBe('Unknown');
    });
  });

  describe('formatAuthUserResponse', () => {
    it('formats minimal user response', () => {
      const user = {
        id: 'u1',
        username: 'alice',
        email: 'alice@example.com',
        profile: { displayName: 'Alice In Wonderland' },
        roles: [{ role: { code: 'ADMIN' } }],
      } as never;

      const result = formatAuthUserResponse(user, 'org-1');
      expect(result).toEqual({
        id: 'u1',
        name: 'Alice In Wonderland',
        roles: ['ADMIN'],
        currentOrgId: 'org-1',
      });
    });

    it('defaults roles to USER when empty', () => {
      const user = {
        id: 'u2',
        username: 'bob',
        email: 'bob@example.com',
        profile: null,
        roles: [],
      } as never;

      const result = formatAuthUserResponse(user);
      expect(result.roles).toEqual(['USER']);
    });
  });

  describe('formatAuthUserWithPermissions', () => {
    it('formats complete user with permissions', () => {
      const date = new Date('2026-01-01T00:00:00.000Z');
      const user = {
        id: 'u1',
        username: 'alice',
        email: 'alice@example.com',
        phone: '13800000000',
        countryCode: '+86',
        profile: { displayName: 'Alice' },
        roles: ['ADMIN'],
        active: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: date,
        lastLoginAt: date,
      };

      const result = formatAuthUserWithPermissions(
        user,
        ['user:manage'],
        'org-100',
        'https://avatar.url',
      );

      expect(result).toEqual({
        id: 'u1',
        username: 'alice',
        email: 'alice@example.com',
        phone: '138****0000',
        countryCode: '+86',
        name: 'Alice',
        avatar: 'https://avatar.url',
        roles: ['ADMIN'],
        currentOrgId: 'org-100',
        perm: ['user:manage'],
        active: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        lastLoginAt: '2026-01-01T00:00:00.000Z',
      });
    });
  });

  describe('formatPermissionsResponse', () => {
    it('formats permissions response DTO', () => {
      const user = {
        id: 'u1',
        username: 'alice',
        email: 'alice@example.com',
        roles: ['USER'],
        active: true,
        emailVerified: true,
        phoneVerified: false,
        createdAt: new Date(),
      };

      const result = formatPermissionsResponse(user, ['meeting:read']);
      expect(result).toEqual({
        id: 'u1',
        name: 'alice',
        roles: ['USER'],
        perm: ['meeting:read'],
      });
    });
  });
});
