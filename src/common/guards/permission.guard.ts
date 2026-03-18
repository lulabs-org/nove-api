import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PERMISSION_MODE_KEY,
  PermissionMode,
} from '../decorators/permissions.decorator';
import { PermService } from '../../permission/services/permission.service';

interface RequestWithUser {
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
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const mode =
      this.reflector.getAllAndOverride<PermissionMode>(PERMISSION_MODE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || PermissionMode.ANY;

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user?.id) {
      this.logger.warn('User not found in request');
      return false;
    }

    try {
      let hasPermission = false;

      switch (mode) {
        case PermissionMode.ALL:
          hasPermission = await this.permissionService.hasAllPermissions(
            user.id,
            requiredPermissions,
          );
          break;
        case PermissionMode.ANY:
        default:
          hasPermission = await this.permissionService.hasAnyPermission(
            user.id,
            requiredPermissions,
          );
          break;
      }

      if (!hasPermission) {
        this.logger.warn(
          `User ${user.id} does not have required permissions: ${requiredPermissions.join(', ')}`,
        );
      }

      return hasPermission;
    } catch (error) {
      this.logger.error('Error checking permissions', error);
      return false;
    }
  }
}
