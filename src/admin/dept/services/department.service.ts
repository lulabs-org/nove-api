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

  private static readonly AUTO_CODE_PREFIX = 'DEPT-';
  private static readonly AUTO_CODE_PATTERN = /^DEPT-(\d+)$/;

  async createDepartment(
    organizationId: string,
    dto: CreateDepartmentDto,
  ): Promise<DepartmentDto> {
    const suppliedCode = dto.code?.trim();
    const leaderUserId = dto.leaderUserId?.trim();
    if (suppliedCode) {
      const existingDept = await this.departmentRepository.findByOrgIdAndCode(
        organizationId,
        suppliedCode,
      );
      if (existingDept) {
        throw new BadRequestException('Department code already exists');
      }
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

    await this.validateLeader(organizationId, leaderUserId);

    if (suppliedCode) {
      const department = await this.departmentRepository.create(
        this.buildCreateData(organizationId, dto, suppliedCode, leaderUserId),
      );
      return this.toDto(department);
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const generatedCode = await this.generateDepartmentCode(organizationId);
      try {
        const department = await this.departmentRepository.create(
          this.buildCreateData(
            organizationId,
            dto,
            generatedCode,
            leaderUserId,
          ),
        );
        return this.toDto(department);
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) {
          throw error;
        }
      }
    }

    throw new BadRequestException(
      'Unable to generate a unique department code',
    );
  }

  private buildCreateData(
    organizationId: string,
    dto: CreateDepartmentDto,
    code: string,
    leaderUserId?: string,
  ): Prisma.DeptCreateInput {
    return {
      name: dto.name,
      code,
      description: dto.description,
      org: {
        connect: { id: organizationId },
      },
      parent: dto.parentId
        ? {
            connect: { id: dto.parentId },
          }
        : undefined,
      leaderUser: leaderUserId
        ? {
            connect: { id: leaderUserId },
          }
        : undefined,
      level: dto.level || 1,
      sortOrder: dto.sortOrder || 0,
      active: dto.active !== undefined ? dto.active : true,
    };
  }

  private async generateDepartmentCode(
    organizationId: string,
  ): Promise<string> {
    const codes =
      await this.departmentRepository.findCodesByOrganizationId(organizationId);
    const highestSequence = codes.reduce((highest, code) => {
      const match = DepartmentService.AUTO_CODE_PATTERN.exec(code);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);

    return `${DepartmentService.AUTO_CODE_PREFIX}${String(
      highestSequence + 1,
    ).padStart(4, '0')}`;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private async validateLeader(
    organizationId: string,
    leaderUserId?: string | null,
  ): Promise<void> {
    if (!leaderUserId) return;

    const isEligible = await this.departmentRepository.isEligibleLeader(
      organizationId,
      leaderUserId,
    );
    if (!isEligible) {
      throw new BadRequestException(
        'Department leader must be an active organization member',
      );
    }
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
      leaderUserId?: string | null;
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
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
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
      const codeExists = await this.departmentRepository.findByOrgIdAndCode(
        existingDept.orgId,
        dto.code,
      );
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

    const leaderUserId = dto.leaderUserId?.trim() || null;
    if (dto.leaderUserId !== undefined) {
      await this.validateLeader(existingDept.orgId, leaderUserId);
    }

    const department = await this.departmentRepository.update(id, {
      name: dto.name,
      code: dto.code,
      description: dto.description,
      leaderUser:
        dto.leaderUserId !== undefined
          ? leaderUserId
            ? {
                connect: { id: leaderUserId },
              }
            : {
                disconnect: true,
              }
          : undefined,
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
    leaderUserId?: string | null;
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
      leaderUserId: department.leaderUserId || null,
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
