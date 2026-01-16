import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RoleRepository } from '../repositories/role.repository';
import {
  CreateRoleDto,
  UpdateRoleDto,
  QueryRoleDto,
  RoleDto,
  RoleListResponse,
} from '../dto';
import { Role, RoleType } from '@prisma/client';

interface RoleWithPermissions extends Role {
  permissions: Array<{
    permissionId: string;
  }>;
}

@Injectable()
export class RoleService {
  constructor(private readonly roleRepository: RoleRepository) {}

  async create(dto: CreateRoleDto): Promise<RoleDto> {
    const codeExists = await this.roleRepository.checkCodeExists(dto.code);
    if (codeExists) {
      throw new BadRequestException(`Role code "${dto.code}" already exists`);
    }

    const role = await this.roleRepository.create({
      name: dto.name,
      code: dto.code,
      description: dto.description,
      type: dto.type || RoleType.CUSTOM,
      level: dto.level || 1,
      active: dto.active !== undefined ? dto.active : true,
    });

    const roleWithPermissions: RoleWithPermissions = {
      ...role,
      permissions: [],
    };

    return this.toDto(roleWithPermissions);
  }

  async findById(id: string): Promise<RoleDto> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.toDto(role);
  }

  async findByCode(code: string): Promise<RoleDto> {
    const role = await this.roleRepository.findByCode(code);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.toDto(role);
  }

  async findAll(query: QueryRoleDto): Promise<RoleListResponse> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: Record<string, any> = {
      isDeleted: false,
    };

    if (query.name) {
      where.name = { contains: query.name };
    }

    if (query.code) {
      where.code = query.code;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.active !== undefined) {
      where.active = query.active;
    }

    const { items, total } = await this.roleRepository.findMany({
      skip,
      take: pageSize,
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: items.map((item) => this.toDto(item as RoleWithPermissions)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleDto> {
    const existingRole = await this.roleRepository.findById(id);
    if (!existingRole) {
      throw new NotFoundException('Role not found');
    }

    if (existingRole.type === (RoleType.SYSTEM as any)) {
      throw new BadRequestException('Cannot update system roles');
    }

    if (dto.permissionIds !== undefined) {
      await this.roleRepository.updatePermissions(id, dto.permissionIds);
    }

    const updatedRole = await this.roleRepository.update(id, {
      name: dto.name,
      description: dto.description,
      level: dto.level,
      active: dto.active,
    });

    return this.toDto({
      ...updatedRole,
      permissions: existingRole.permissions,
    });
  }

  async delete(id: string): Promise<void> {
    const existingRole = await this.roleRepository.findById(id);
    if (!existingRole) {
      throw new NotFoundException('Role not found');
    }

    if (existingRole.type === RoleType.SYSTEM) {
      throw new BadRequestException('Cannot delete system roles');
    }

    await this.roleRepository.delete(id);
  }

  private toDto(role: RoleWithPermissions): RoleDto {
    return {
      id: role.id,
      name: role.name,
      code: role.code,
      description: role.description,
      type: role.type,
      level: role.level,
      active: role.active,
      permissionIds: role.permissions?.map((p) => p.permissionId) || [],
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  async getUserRoles(userId: string) {
    return this.roleRepository.findUserRoles(userId);
  }

  async hasAnyRole(userId: string, roleCodes: string[]): Promise<boolean> {
    return this.roleRepository.hasAnyRole(userId, roleCodes);
  }

  async hasAllRoles(userId: string, roleCodes: string[]): Promise<boolean> {
    return this.roleRepository.hasAllRoles(userId, roleCodes);
  }
}
