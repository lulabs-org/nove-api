import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@/auth/decorators/public.decorator';
import type { AuthContext } from '@/auth/types/auth-context.interface';
import {
  NO_PERMISSION_REQUIRED_KEY,
  PERMISSION_MODE_KEY,
  PERMISSIONS_KEY,
  PermissionMode,
} from '../decorators/permissions.decorator';
import { PermService } from '../services/permission.service';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard', () => {
  const permissionService = {
    hasAnyPermission: jest.fn(),
    hasAllPermissions: jest.fn(),
  };

  const createGuard = (metadata: {
    isPublic?: boolean;
    noPermissionRequired?: boolean;
    permissions?: string[];
    mode?: PermissionMode;
  }) => {
    const reflector = {
      getAllAndOverride: jest.fn().mockImplementation((key: string) => {
        if (key === IS_PUBLIC_KEY) return metadata.isPublic;
        if (key === NO_PERMISSION_REQUIRED_KEY)
          return metadata.noPermissionRequired;
        if (key === PERMISSIONS_KEY) return metadata.permissions;
        if (key === PERMISSION_MODE_KEY) return metadata.mode;
        return undefined;
      }),
    };

    return new PermissionGuard(
      reflector as unknown as Reflector,
      permissionService as unknown as PermService,
    );
  };

  const createContext = (authContext?: Partial<AuthContext>) =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ authContext }),
      }),
    }) as unknown as ExecutionContext;

  const apiKeyContext = (permissions: string[]) =>
    createContext({
      authMethod: 'api_key',
      userId: 'user-1',
      orgId: 'org-1',
      permissions,
      apiKeyId: 'key-1',
    });

  const jwtContext = () =>
    createContext({
      authMethod: 'jwt',
      userId: 'user-1',
      orgId: 'org-1',
      permissions: [],
    });

  const oauthContext = (permissions: string[]) =>
    createContext({
      authMethod: 'oauth',
      userId: 'user-1',
      orgId: 'org-1',
      permissions,
      oauthClientId: 'nove-cli',
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps JWT authorization based on current user role permissions', async () => {
    const guard = createGuard({ permissions: ['meeting:read'] });
    permissionService.hasAnyPermission.mockResolvedValue(true);

    await expect(guard.canActivate(jwtContext())).resolves.toBe(true);
    expect(permissionService.hasAnyPermission).toHaveBeenCalledWith('user-1', [
      'meeting:read',
    ]);
  });

  it('allows an API key only when its scope and creator role both contain the permission', async () => {
    const guard = createGuard({ permissions: ['meeting:read'] });
    permissionService.hasAnyPermission.mockResolvedValue(true);

    await expect(
      guard.canActivate(apiKeyContext(['meeting:read'])),
    ).resolves.toBe(true);
    expect(permissionService.hasAnyPermission).toHaveBeenCalledWith('user-1', [
      'meeting:read',
    ]);
  });

  it('rejects an API key that lacks the required scope without querying user roles', async () => {
    const guard = createGuard({ permissions: ['meeting:read'] });

    await expect(
      guard.canActivate(apiKeyContext(['meeting:create'])),
    ).resolves.toBe(false);
    expect(permissionService.hasAnyPermission).not.toHaveBeenCalled();
  });

  it('rejects an API key when its creator no longer has the scoped permission', async () => {
    const guard = createGuard({ permissions: ['meeting:read'] });
    permissionService.hasAnyPermission.mockResolvedValue(false);

    await expect(
      guard.canActivate(apiKeyContext(['meeting:read'])),
    ).resolves.toBe(false);
  });

  it('treats OAuth scopes as an upper bound and rechecks the current user role', async () => {
    const guard = createGuard({ permissions: ['meeting:delete'] });

    await expect(
      guard.canActivate(oauthContext(['meeting:read'])),
    ).resolves.toBe(false);
    expect(permissionService.hasAnyPermission).not.toHaveBeenCalled();

    permissionService.hasAnyPermission.mockResolvedValue(false);
    await expect(
      guard.canActivate(oauthContext(['meeting:delete'])),
    ).resolves.toBe(false);
    expect(permissionService.hasAnyPermission).toHaveBeenCalledWith('user-1', [
      'meeting:delete',
    ]);
  });

  it('requires the same overlapping permission in ANY mode', async () => {
    const guard = createGuard({
      permissions: ['meeting:read', 'meeting:create'],
      mode: PermissionMode.ANY,
    });
    permissionService.hasAnyPermission.mockResolvedValue(false);

    await expect(
      guard.canActivate(apiKeyContext(['meeting:read'])),
    ).resolves.toBe(false);
    expect(permissionService.hasAnyPermission).toHaveBeenCalledWith('user-1', [
      'meeting:read',
    ]);
  });

  it('requires every API key scope and every creator permission in ALL mode', async () => {
    const guard = createGuard({
      permissions: ['meeting:read', 'meeting:create'],
      mode: PermissionMode.ALL,
    });

    await expect(
      guard.canActivate(apiKeyContext(['meeting:read'])),
    ).resolves.toBe(false);
    expect(permissionService.hasAllPermissions).not.toHaveBeenCalled();

    permissionService.hasAllPermissions.mockResolvedValue(true);
    await expect(
      guard.canActivate(apiKeyContext(['meeting:read', 'meeting:create'])),
    ).resolves.toBe(true);
    expect(permissionService.hasAllPermissions).toHaveBeenCalledWith('user-1', [
      'meeting:read',
      'meeting:create',
    ]);
  });

  it('keeps public and explicitly permission-free routes accessible', async () => {
    await expect(
      createGuard({ isPublic: true }).canActivate(createContext()),
    ).resolves.toBe(true);
    await expect(
      createGuard({ noPermissionRequired: true }).canActivate(createContext()),
    ).resolves.toBe(true);
  });

  it('still rejects routes that omit permission configuration', async () => {
    await expect(createGuard({}).canActivate(jwtContext())).rejects.toThrow(
      ForbiddenException,
    );
  });
});
