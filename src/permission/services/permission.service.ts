import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PermRepository } from '../repositories/permission.repository';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  QueryPermissionDto,
  PermissionTreeDto,
  PermissionListResponse,
  CreateDataPermissionRuleDto,
  UpdateDataPermissionRuleDto,
  QueryDataPermissionRuleDto,
  DataPermissionRuleDto,
  DataPermissionRuleListResponse,
} from '../dto';
import { Permission, DataPermissionRule } from '@prisma/client';

interface PermissionWithChildren extends Permission {
  parent?: Permission | null;
  children?: Permission[];
}

interface DataPermissionRuleWithFields extends DataPermissionRule {
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class PermService {
  private readonly logger = new Logger(PermService.name);

  constructor(private readonly permRepo: PermRepository) {}

  async getPermissionsByRoleCodes(roleCodes: string[]): Promise<string[]> {
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

  async getPermissionsByUserId(userId: string): Promise<string[]> {
    try {
      const userRoles = await this.permRepo.findUserRoles(userId);

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
      return await this.permRepo.findAll();
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

  async createPermission(dto: CreatePermissionDto): Promise<PermissionTreeDto> {
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

  async createDataPermissionRule(
    dto: CreateDataPermissionRuleDto,
  ): Promise<DataPermissionRuleDto> {
    const codeExists = await this.permRepo.checkDataPermissionRuleCodeExists(
      dto.code,
    );
    if (codeExists) {
      throw new BadRequestException(
        `Data permission rule code "${dto.code}" already exists`,
      );
    }

    const rule = await this.permRepo.createDataPermissionRule(dto);
    return this.toDataPermissionRuleDto(rule);
  }

  async findDataPermissionRuleById(id: string): Promise<DataPermissionRuleDto> {
    const rule = await this.permRepo.findDataPermissionRuleById(id);
    if (!rule) {
      throw new NotFoundException('Data permission rule not found');
    }

    return this.toDataPermissionRuleDto(rule);
  }

  async findDataPermissionRuleByCode(
    code: string,
  ): Promise<DataPermissionRuleDto> {
    const rule = await this.permRepo.findDataPermissionRuleByCode(code);
    if (!rule) {
      throw new NotFoundException('Data permission rule not found');
    }

    return this.toDataPermissionRuleDto(rule);
  }

  async findAllDataPermissionRules(
    query: QueryDataPermissionRuleDto,
  ): Promise<DataPermissionRuleListResponse> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: Record<string, any> = {};

    if (query.name) {
      where.name = { contains: query.name };
    }

    if (query.code) {
      where.code = query.code;
    }

    if (query.resource) {
      where.resource = query.resource;
    }

    if (query.active !== undefined) {
      where.active = query.active;
    }

    const { items, total } = await this.permRepo.findDataPermissionRules({
      skip,
      take: pageSize,
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: items.map((item) => this.toDataPermissionRuleDto(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async updateDataPermissionRule(
    id: string,
    dto: UpdateDataPermissionRuleDto,
  ): Promise<DataPermissionRuleDto> {
    const existingRule = await this.permRepo.findDataPermissionRuleById(id);
    if (!existingRule) {
      throw new NotFoundException('Data permission rule not found');
    }

    const updatedRule = await this.permRepo.updateDataPermissionRule(id, dto);
    return this.toDataPermissionRuleDto(updatedRule);
  }

  async deleteDataPermissionRule(id: string): Promise<void> {
    const existingRule = await this.permRepo.findDataPermissionRuleById(id);
    if (!existingRule) {
      throw new NotFoundException('Data permission rule not found');
    }

    await this.permRepo.deleteDataPermissionRule(id);
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

  private toDataPermissionRuleDto(
    rule: DataPermissionRuleWithFields,
  ): DataPermissionRuleDto {
    return {
      id: rule.id,
      name: rule.name,
      code: rule.code,
      description: rule.description,
      resource: rule.resource,
      condition: rule.condition,
      active: rule.active,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}
