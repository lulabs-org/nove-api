/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-09-22 14:31:00
 * @Description: 认证上下文辅助函数单测
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { isSuperAdmin, isSuperOrAdmin } from './auth-context.helper';
import { AuthContext } from '@/auth/types/auth-context.interface';

describe('auth-context.helper', () => {
  describe('isSuperAdmin', () => {
    it('returns false if auth is null or undefined', () => {
      expect(isSuperAdmin(null)).toBe(false);
      expect(isSuperAdmin(undefined)).toBe(false);
    });

    it('returns true if permissions include "*"', () => {
      const auth: AuthContext = {
        authMethod: 'jwt',
        userId: 'usr_1',
        orgId: 'org_1',
        permissions: ['*'],
      };
      expect(isSuperAdmin(auth)).toBe(true);
    });

    it('returns true if role is SUPER_ADMIN', () => {
      const auth: AuthContext = {
        authMethod: 'jwt',
        userId: 'usr_1',
        orgId: 'org_1',
        permissions: [],
        user: { id: 'usr_1', roles: ['SUPER_ADMIN'] } as any,
      };
      expect(isSuperAdmin(auth)).toBe(true);
    });

    it('returns false for regular ADMIN role without super admin role or wildcard', () => {
      const auth: AuthContext = {
        authMethod: 'jwt',
        userId: 'usr_2',
        orgId: 'org_1',
        permissions: ['admin'],
        user: { id: 'usr_2', roles: ['ADMIN'] } as any,
      };
      expect(isSuperAdmin(auth)).toBe(false);
    });
  });

  describe('isSuperOrAdmin', () => {
    it('returns false if auth is null or undefined', () => {
      expect(isSuperOrAdmin(null)).toBe(false);
      expect(isSuperOrAdmin(undefined)).toBe(false);
    });

    it('returns true if permissions include "*"', () => {
      const auth: AuthContext = {
        authMethod: 'jwt',
        userId: 'usr_1',
        orgId: 'org_1',
        permissions: ['*'],
      };
      expect(isSuperOrAdmin(auth)).toBe(true);
    });

    it('returns true if permissions include "admin"', () => {
      const auth: AuthContext = {
        authMethod: 'jwt',
        userId: 'usr_1',
        orgId: 'org_1',
        permissions: ['admin'],
      };
      expect(isSuperOrAdmin(auth)).toBe(true);
    });

    it('returns true if permissions include the domain-specific admin permission', () => {
      const auth: AuthContext = {
        authMethod: 'jwt',
        userId: 'usr_1',
        orgId: 'org_1',
        permissions: ['order:admin'],
      };
      expect(isSuperOrAdmin(auth, 'order:admin')).toBe(true);
      expect(isSuperOrAdmin(auth, 'user:admin')).toBe(false);
    });

    it('returns true if user roles include SUPER_ADMIN', () => {
      const superAdminAuth: AuthContext = {
        authMethod: 'jwt',
        userId: 'usr_1',
        orgId: 'org_1',
        permissions: [],
        user: { id: 'usr_1', roles: ['SUPER_ADMIN'] } as any,
      };
      expect(isSuperOrAdmin(superAdminAuth)).toBe(true);
    });

    it('returns false for plain ADMIN role when without matching permissions', () => {
      const plainAdminAuth: AuthContext = {
        authMethod: 'jwt',
        userId: 'usr_2',
        orgId: 'org_1',
        permissions: ['order:read'],
        user: { id: 'usr_2', roles: ['ADMIN'] } as any,
      };
      // 不再无脑给 ADMIN 角色通配特权，必须具备相应权限
      expect(isSuperOrAdmin(plainAdminAuth, 'order:admin')).toBe(false);
    });

    it('returns false for regular user without admin roles or permissions', () => {
      const regularAuth: AuthContext = {
        authMethod: 'jwt',
        userId: 'usr_reg',
        orgId: 'org_1',
        permissions: ['order:read', 'order:create'],
        user: { id: 'usr_reg', roles: ['MEMBER'] } as any,
      };
      expect(isSuperOrAdmin(regularAuth, 'order:admin')).toBe(false);
    });
  });
});
