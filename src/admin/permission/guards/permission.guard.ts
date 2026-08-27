import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PERMISSION_MODE_KEY,
  PermissionMode,
  NO_PERMISSION_REQUIRED_KEY,
} from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '@/auth/decorators/public.decorator';
import type { AuthContext } from '@/auth/types/auth-context.interface';
import { PermService } from '../services/permission.service';

interface RequestWithAuthContext {
  authContext?: Pick<
    AuthContext,
    'authMethod' | 'userId' | 'permissions' | 'apiKeyId'
  >;
  user?: {
    id: string;
  };
}

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. 检查是否为公共接口
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 2. 检查是否显式声明了无需权限
    const noPermissionRequired = this.reflector.getAllAndOverride<boolean>(
      NO_PERMISSION_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (noPermissionRequired) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const mode =
      this.reflector.getAllAndOverride<PermissionMode>(PERMISSION_MODE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || PermissionMode.ANY;

    // 3. 严格模式：如果没有声明具体权限点，则拒绝访问（防止接口裸奔）
    if (!requiredPermissions || requiredPermissions.length === 0) {
      this.logger.error(
        `Route ${context.getClass().name}.${context.getHandler().name} is missing permission configuration! Please add @RequirePermissions or @NoPermissionRequired.`,
      );
      throw new ForbiddenException('权限配置缺失，禁止访问');
    }

    const request = context.switchToHttp().getRequest<RequestWithAuthContext>();

    // 优先从统一认证上下文获取 userId
    const userId = request.authContext?.userId ?? request.user?.id;

    if (!userId) {
      this.logger.warn('User not found in request');
      return false;
    }

    try {
      const permissionsToCheck =
        this.getPermissionsAllowedByDelegatedCredential(
          request.authContext,
          requiredPermissions,
          mode,
        );

      if (!permissionsToCheck) {
        return false;
      }

      let hasPermission = false;

      switch (mode) {
        case PermissionMode.ALL:
          hasPermission = await this.permissionService.hasAllPermissions(
            userId,
            permissionsToCheck,
          );
          break;
        case PermissionMode.ANY:
        default:
          hasPermission = await this.permissionService.hasAnyPermission(
            userId,
            permissionsToCheck,
          );
          break;
      }

      if (!hasPermission) {
        this.logger.warn(
          `User ${userId} does not have required permissions: ${requiredPermissions.join(', ')}`,
        );
      }

      return hasPermission;
    } catch (error) {
      this.logger.error('Error checking permissions', error);
      return false;
    }
  }

  /**
   * API Key 权限是创建者权限的收窄，而不是创建者权限的替代品。
   *
   * ANY 模式下必须保证同一个权限点同时存在于 Key scopes 和用户角色中；
   * 不能出现 Key 有 A、用户有 B，却因为双方各自满足 ANY 而放行的情况。
   */
  private getPermissionsAllowedByDelegatedCredential(
    authContext: RequestWithAuthContext['authContext'],
    requiredPermissions: string[],
    mode: PermissionMode,
  ): string[] | null {
    if (
      authContext?.authMethod !== 'api_key' &&
      authContext?.authMethod !== 'oauth'
    ) {
      return requiredPermissions;
    }

    const apiKeyScopes = new Set(authContext.permissions);
    const scopedPermissions = requiredPermissions.filter((permission) =>
      apiKeyScopes.has(permission),
    );
    const hasRequiredScopes =
      mode === PermissionMode.ALL
        ? scopedPermissions.length === requiredPermissions.length
        : scopedPermissions.length > 0;

    if (!hasRequiredScopes) {
      this.logger.warn(
        `Delegated credential ${authContext.apiKeyId ?? 'oauth'} does not have required scopes: ${requiredPermissions.join(', ')}`,
      );
      return null;
    }

    return scopedPermissions;
  }
}
