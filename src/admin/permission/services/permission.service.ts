import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PermRepository } from '../repositories';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  QueryPermissionDto,
  PermissionTreeDto,
  PermissionListResponse,
} from '../dto';
import { Permission } from '@prisma/client';

interface PermissionWithChildren extends Permission {
  parent?: Permission | null;
  children?: Permission[];
}

export const SUPER_ADMIN_ROLE_CODE = 'SUPER_ADMIN';

@Injectable()
export class PermService {
  private readonly logger = new Logger(PermService.name);

  constructor(private readonly permRepo: PermRepository) {}

  async getPermByRoleCodes(roleCodes: string[]): Promise<string[]> {
    if (!roleCodes || roleCodes.length === 0) {
      return [];
    }

    try {
      const roles = await this.permRepo.findRolesByCodes(roleCodes);

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

  private async getUserRoleCodes(userId: string): Promise<string[]> {
    const userRoles = await this.permRepo.findUserRoles(userId);
    return userRoles
      .map((userRole) => userRole.role?.code)
      .filter((code): code is string => !!code);
  }

  async getPermByUserId(userId: string): Promise<string[]> {
    try {
      const roleCodes = await this.getUserRoleCodes(userId);
      return this.getPermByRoleCodes(roleCodes);
    } catch (error) {
      this.logger.error(`Failed to get permissions for user: ${userId}`, error);
      throw error;
    }
  }

  async getAllPerm(): Promise<
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
      return await this.permRepo.findAll();
    } catch (error) {
      this.logger.error('Failed to get all permissions', error);
      throw error;
    }
  }

  async getPermByResource(resource: string): Promise<
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
      return await this.permRepo.findByResource(resource);
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
      const roleCodes = await this.getUserRoleCodes(userId);
      if (roleCodes.includes(SUPER_ADMIN_ROLE_CODE)) {
        return true;
      }

      const perm = await this.getPermByRoleCodes(roleCodes);
      return perm.includes(permissionCode);
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
      const roleCodes = await this.getUserRoleCodes(userId);
      if (roleCodes.includes(SUPER_ADMIN_ROLE_CODE)) {
        return true;
      }

      const perm = await this.getPermByRoleCodes(roleCodes);
      return permissionCodes.some((code) => perm.includes(code));
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
      const roleCodes = await this.getUserRoleCodes(userId);
      if (roleCodes.includes(SUPER_ADMIN_ROLE_CODE)) {
        return true;
      }

      const perm = await this.getPermByRoleCodes(roleCodes);
      return permissionCodes.every((code) => perm.includes(code));
    } catch (error) {
      this.logger.error(
        `Failed to check permissions for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  async createPerm(dto: CreatePermissionDto): Promise<PermissionTreeDto> {
    const codeExists = await this.permRepo.checkCodeExists(dto.code);
    if (codeExists) {
      throw new BadRequestException(
        `Permission code "${dto.code}" already exists`,
      );
    }

    const permission = await this.permRepo.create(dto);
    return this.toTreeDto(permission);
  }

  async findById(id: string): Promise<PermissionTreeDto> {
    const permission = await this.permRepo.findById(id);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return this.toTreeDto(permission);
  }

  async findByCode(code: string): Promise<PermissionTreeDto> {
    const permission = await this.permRepo.findByCode(code);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return this.toTreeDto(permission);
  }

  async findAll(query: QueryPermissionDto): Promise<PermissionListResponse> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: Record<string, any> = {};

    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { code: { contains: query.keyword } },
        { resource: { contains: query.keyword } },
        { action: { contains: query.keyword } },
      ];
    }

    if (query.name) {
      where.name = { contains: query.name };
    }

    if (query.code) {
      where.code = query.code;
    }

    if (query.resource) {
      where.resource = query.resource;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.parentId !== undefined) {
      where.parentId = query.parentId;
    }

    if (query.active !== undefined) {
      where.active = query.active;
    }

    const { items, total } = await this.permRepo.findMany({
      skip,
      take: pageSize,
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return {
      items: items.map((item) => this.toTreeDto(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getTree(): Promise<PermissionTreeDto[]> {
    const tree = await this.permRepo.findTree();
    return tree;
  }

  async update(
    id: string,
    dto: UpdatePermissionDto,
  ): Promise<PermissionTreeDto> {
    const existingPermission = await this.permRepo.findById(id);
    if (!existingPermission) {
      throw new NotFoundException('Permission not found');
    }

    const updatedPermission = await this.permRepo.update(id, dto);
    return this.toTreeDto(updatedPermission);
  }

  async delete(id: string): Promise<void> {
    const existingPermission = await this.permRepo.findById(id);
    if (!existingPermission) {
      throw new NotFoundException('Permission not found');
    }

    await this.permRepo.delete(id);
  }

  private toTreeDto(permission: PermissionWithChildren): PermissionTreeDto {
    return {
      id: permission.id,
      name: permission.name,
      code: permission.code,
      description: permission.description,
      resource: permission.resource,
      action: permission.action,
      type: permission.type,
      parentId: permission.parentId,
      level: permission.level,
      sortOrder: permission.sortOrder,
      active: permission.active,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
      children: permission.children?.map((child) => this.toTreeDto(child)),
    };
  }
}
