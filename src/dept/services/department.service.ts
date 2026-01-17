import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DepartmentRepository } from '../repositories/department.repository';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  PaginationDto,
  DepartmentDto,
  DepartmentListResponse,
  DepartmentTreeDto,
  MoveDepartmentDto,
  DepartmentMembersResponse,
  DepartmentAncestorsResponse,
  DepartmentAncestorDto,
  DepartmentMemberDto,
} from '../dto';

@Injectable()
export class DepartmentService {
  constructor(private readonly departmentRepository: DepartmentRepository) {}

  async createDepartment(
    organizationId: string,
    dto: CreateDepartmentDto,
  ): Promise<DepartmentDto> {
    const existingDept = await this.departmentRepository.findByCode(dto.code);
    if (existingDept) {
      throw new BadRequestException('Department code already exists');
    }

    if (dto.parentId) {
      const parent = await this.departmentRepository.findById(dto.parentId);
      if (!parent) {
        throw new NotFoundException('Parent department not found');
      }
      if (parent.orgId !== organizationId) {
        throw new BadRequestException(
          'Parent department must belong to the same organization',
        );
      }
    }

    const department = await this.departmentRepository.create({
      name: dto.name,
      code: dto.code,
      description: dto.description,
      org: {
        connect: { id: organizationId },
      },
      parent: dto.parentId
        ? {
            connect: { id: dto.parentId },
          }
        : undefined,
      level: dto.level || 1,
      sortOrder: dto.sortOrder || 0,
      active: dto.active !== undefined ? dto.active : true,
    });

    return this.toDto(department);
  }

  async getDepartmentTree(
    organizationId: string,
  ): Promise<DepartmentTreeDto[]> {
    const departments =
      await this.departmentRepository.findTree(organizationId);
    return this.buildTreeDto(departments);
  }

  private buildTreeDto(
    departments: Array<{
      id: string;
      name: string;
      code: string;
      description: string | null;
      orgId: string;
      parentId: string | null;
      level: number;
      sortOrder: number;
      active: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>,
    parentId: string | null = null,
  ): DepartmentTreeDto[] {
    return departments
      .filter((dept) => dept.parentId === parentId)
      .map((dept) => ({
        ...this.toDto(dept),
        children: this.buildTreeDto(departments, dept.id),
      }));
  }

  async listDepartments(
    organizationId: string,
    pagination?: PaginationDto,
  ): Promise<DepartmentListResponse> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.DeptWhereInput = {};

    if (pagination?.parentId) {
      where.parentId = pagination.parentId;
    }

    if (pagination?.level) {
      where.level = pagination.level;
    }

    const { items, total } =
      await this.departmentRepository.findByOrganizationId(organizationId, {
        skip,
        take: pageSize,
        orderBy: { sortOrder: 'asc', createdAt: 'desc' },
        where,
      });

    return {
      items: items.map((item) => this.toDto(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getDepartment(id: string): Promise<DepartmentDto> {
    const department = await this.departmentRepository.findById(id);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return this.toDto(department);
  }

  async updateDepartment(
    id: string,
    dto: UpdateDepartmentDto,
  ): Promise<DepartmentDto> {
    const existingDept = await this.departmentRepository.findById(id);
    if (!existingDept) {
      throw new NotFoundException('Department not found');
    }

    if (dto.code && dto.code !== existingDept.code) {
      const codeExists = await this.departmentRepository.findByCode(dto.code);
      if (codeExists) {
        throw new BadRequestException('Department code already exists');
      }
    }

    if (dto.parentId && dto.parentId !== existingDept.parentId) {
      const parent = await this.departmentRepository.findById(dto.parentId);
      if (!parent) {
        throw new NotFoundException('Parent department not found');
      }
      if (parent.orgId !== existingDept.orgId) {
        throw new BadRequestException(
          'Parent department must belong to the same organization',
        );
      }
      if (parent.id === id) {
        throw new BadRequestException('Department cannot be its own parent');
      }
    }

    const department = await this.departmentRepository.update(id, {
      name: dto.name,
      code: dto.code,
      description: dto.description,
      parent:
        dto.parentId !== undefined
          ? dto.parentId
            ? {
                connect: { id: dto.parentId },
              }
            : {
                disconnect: true,
              }
          : undefined,
      level: dto.level,
      sortOrder: dto.sortOrder,
      active: dto.active,
    });

    return this.toDto(department);
  }

  async moveDepartment(
    id: string,
    dto: MoveDepartmentDto,
  ): Promise<DepartmentDto> {
    const existingDept = await this.departmentRepository.findById(id);
    if (!existingDept) {
      throw new NotFoundException('Department not found');
    }

    if (dto.parentId && dto.parentId !== existingDept.parentId) {
      const parent = await this.departmentRepository.findById(dto.parentId);
      if (!parent) {
        throw new NotFoundException('Parent department not found');
      }
      if (parent.orgId !== existingDept.orgId) {
        throw new BadRequestException(
          'Parent department must belong to the same organization',
        );
      }
      if (parent.id === id) {
        throw new BadRequestException('Department cannot be its own parent');
      }
    }

    const department = await this.departmentRepository.move(
      id,
      dto.parentId !== undefined ? dto.parentId : existingDept.parentId,
      dto.sortOrder,
    );

    return this.toDto(department);
  }

  async updateStatus(id: string, active: boolean): Promise<DepartmentDto> {
    const department = await this.departmentRepository.findById(id);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const updated = await this.departmentRepository.updateStatus(id, active);
    return this.toDto(updated);
  }

  async deleteDepartment(id: string): Promise<void> {
    const department = await this.departmentRepository.findById(id);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const hasChildren = await this.departmentRepository.hasChildren(id);
    if (hasChildren) {
      throw new BadRequestException(
        'Cannot delete department with child departments',
      );
    }

    const hasMembers = await this.departmentRepository.hasMembers(id, true);
    if (hasMembers) {
      throw new BadRequestException('Cannot delete department with members');
    }

    await this.departmentRepository.softDelete(id);
  }

  async getDepartmentMembers(
    id: string,
    includeChildren: boolean = false,
    page: number = 1,
    pageSize: number = 10,
  ): Promise<DepartmentMembersResponse> {
    const department = await this.departmentRepository.findById(id);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const skip = (page - 1) * pageSize;

    const { items, total } = await this.departmentRepository.findMembers(
      id,
      includeChildren,
      {
        skip,
        take: pageSize,
      },
    );

    return {
      items: items.map((item) => this.toMemberDto(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getDepartmentAncestors(
    id: string,
  ): Promise<DepartmentAncestorsResponse> {
    const department = await this.departmentRepository.findById(id);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const ancestors = await this.departmentRepository.findAncestors(id);

    return {
      items: ancestors.map((ancestor) => this.toAncestorDto(ancestor)),
    };
  }

  async getDepartmentChildren(id: string): Promise<DepartmentDto[]> {
    const department = await this.departmentRepository.findById(id);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    const children = await this.departmentRepository.findChildren(id);

    return children.map((child) => this.toDto(child));
  }

  private toDto(department: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    orgId: string;
    parentId: string | null;
    level: number;
    sortOrder: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
  }): DepartmentDto {
    return {
      id: department.id,
      name: department.name,
      code: department.code,
      description: department.description,
      organizationId: department.orgId,
      parentId: department.parentId,
      level: department.level,
      sortOrder: department.sortOrder,
      active: department.active,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
      deletedAt: department.deletedAt || null,
      leaderUserId: null,
    };
  }

  private toMemberDto(item: {
    user: {
      id: string;
      username: string | null;
      email: string | null;
      profile: {
        displayName: string | null;
        avatar: string | null;
      } | null;
    };
    isPrimary: boolean;
    createdAt: Date;
  }): DepartmentMemberDto {
    return {
      userId: item.user.id,
      username: item.user.username,
      displayName: item.user.profile?.displayName || null,
      avatar: item.user.profile?.avatar || null,
      email: item.user.email,
      isPrimary: item.isPrimary,
      joinedAt: item.createdAt,
    };
  }

  private toAncestorDto(department: {
    id: string;
    name: string;
    code: string;
    level: number;
  }): DepartmentAncestorDto {
    return {
      id: department.id,
      name: department.name,
      code: department.code,
      level: department.level,
    };
  }
}
