import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ROLES_KEY,
  ROLE_MODE_KEY,
  RoleMode,
} from '../decorators/roles.decorator';
import { RoleService } from '../services/role.service';

interface RequestWithAuthContext {
  authContext?: {
    userId: string | null;
  };
  user?: {
    id: string;
  };
}

@Injectable()
export class RoleGuard implements CanActivate {
  private readonly logger = new Logger(RoleGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly roleService: RoleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const mode =
      this.reflector.getAllAndOverride<RoleMode>(ROLE_MODE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || RoleMode.ANY;

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuthContext>();

    // 优先从统一认证上下文获取 userId
    const userId = request.authContext?.userId ?? request.user?.id;

    if (!userId) {
      this.logger.warn('User not found in request');
      return false;
    }

    try {
      let hasRole = false;

      switch (mode) {
        case RoleMode.ALL:
          hasRole = await this.roleService.hasAllRoles(userId, requiredRoles);
          break;
        case RoleMode.ANY:
        default:
          hasRole = await this.roleService.hasAnyRole(userId, requiredRoles);
          break;
      }

      if (!hasRole) {
        this.logger.warn(
          `User ${userId} does not have required roles: ${requiredRoles.join(', ')}`,
        );
      }

      return hasRole;
    } catch (error) {
      this.logger.error('Error checking roles', error);
      return false;
    }
  }
}
