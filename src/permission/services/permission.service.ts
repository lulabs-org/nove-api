import { Injectable, Logger } from '@nestjs/common';
import { PermissionRepository } from '../repositories/permission.repository';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(private readonly permissionRepository: PermissionRepository) {}

  async getPermissionsByRoleCodes(roleCodes: string[]): Promise<string[]> {
    if (!roleCodes || roleCodes.length === 0) {
      return [];
    }

    try {
      const roles = await this.permissionRepository.findRolesByCodes(roleCodes);

      const permissionSet = new Set<string>();

      for (const role of roles) {
        for (const rolePermission of role.permissions) {
          permissionSet.add(rolePermission.permission.code);
        }
      }

      return Array.from(permissionSet);
    } catch (error) {
      this.logger.error(
        `Failed to get permissions for roles: ${roleCodes.join(', ')}`,
        error,
      );
      throw error;
    }
  }

  async getPermissionsByUserId(userId: string): Promise<string[]> {
    try {
      const userRoles = await this.permissionRepository.findUserRoles(userId);

      const roleCodes = userRoles
        .map((userRole) => userRole.role?.code)
        .filter((code): code is string => !!code);

      return this.getPermissionsByRoleCodes(roleCodes);
    } catch (error) {
      this.logger.error(`Failed to get permissions for user: ${userId}`, error);
      throw error;
    }
  }

  async getAllPermissions(): Promise<
    Array<{
      id: string;
      name: string;
      code: string;
      description: string | null;
      resource: string;
      action: string;
      type: string;
    }>
  > {
    try {
      return await this.permissionRepository.findAllPermissions();
    } catch (error) {
      this.logger.error('Failed to get all permissions', error);
      throw error;
    }
  }

  async getPermissionsByResource(resource: string): Promise<
    Array<{
      id: string;
      name: string;
      code: string;
      description: string | null;
      action: string;
      type: string;
    }>
  > {
    try {
      return await this.permissionRepository.findPermissionsByResource(
        resource,
      );
    } catch (error) {
      this.logger.error(
        `Failed to get permissions for resource: ${resource}`,
        error,
      );
      throw error;
    }
  }

  async hasPermission(
    userId: string,
    permissionCode: string,
  ): Promise<boolean> {
    try {
      const permissions = await this.getPermissionsByUserId(userId);
      return permissions.includes(permissionCode);
    } catch (error) {
      this.logger.error(
        `Failed to check permission ${permissionCode} for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  async hasAnyPermission(
    userId: string,
    permissionCodes: string[],
  ): Promise<boolean> {
    try {
      const permissions = await this.getPermissionsByUserId(userId);
      return permissionCodes.some((code) => permissions.includes(code));
    } catch (error) {
      this.logger.error(
        `Failed to check permissions for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  async hasAllPermissions(
    userId: string,
    permissionCodes: string[],
  ): Promise<boolean> {
    try {
      const permissions = await this.getPermissionsByUserId(userId);
      return permissionCodes.every((code) => permissions.includes(code));
    } catch (error) {
      this.logger.error(
        `Failed to check permissions for user ${userId}`,
        error,
      );
      throw error;
    }
  }
}
