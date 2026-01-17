import { Injectable } from '@nestjs/common';
import { Department, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DepartmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.DepartmentCreateInput): Promise<Department> {
    return this.prisma.department.create({
      data,
    });
  }

  async findById(id: string): Promise<Department | null> {
    return this.prisma.department.findUnique({
      where: { id },
    });
  }

  async findByCode(code: string): Promise<Department | null> {
    return this.prisma.department.findUnique({
      where: { code },
    });
  }

  async findByOrganizationId(
    organizationId: string,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.DepartmentOrderByWithRelationInput;
      where?: Prisma.DepartmentWhereInput;
    },
  ): Promise<{ items: Department[]; total: number }> {
    const { skip, take, orderBy, where } = options || {};

    const baseWhere: Prisma.DepartmentWhereInput = {
      organizationId,
      deletedAt: null,
      ...where,
    };

    const [items, total] = await Promise.all([
      this.prisma.department.findMany({
        where: baseWhere,
        skip,
        take,
        orderBy: orderBy || { sortOrder: 'asc', createdAt: 'desc' },
      }),
      this.prisma.department.count({ where: baseWhere }),
    ]);

    return { items, total };
  }

  async findTree(organizationId: string): Promise<Department[]> {
    const departments = await this.prisma.department.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc', createdAt: 'desc' },
    });

    return this.buildTree(departments);
  }

  private buildTree(
    departments: Department[],
    parentId: string | null = null,
  ): Department[] {
    return departments
      .filter((dept) => dept.parentId === parentId)
      .map((dept) => ({
        ...dept,
        children: this.buildTree(departments, dept.id),
      }));
  }

  async findChildren(parentId: string): Promise<Department[]> {
    return this.prisma.department.findMany({
      where: {
        parentId,
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc', createdAt: 'desc' },
    });
  }

  async findAncestors(departmentId: string): Promise<Department[]> {
    const ancestors: Department[] = [];
    let current = await this.findById(departmentId);

    while (current && current.parentId) {
      current = await this.findById(current.parentId);
      if (current) {
        ancestors.unshift(current);
      }
    }

    return ancestors;
  }

  async findMembers(
    departmentId: string,
    includeChildren: boolean = false,
    options?: {
      skip?: number;
      take?: number;
    },
  ): Promise<{
    items: Array<{
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
    }>;
    total: number;
  }> {
    const { skip, take } = options || {};

    const where: Prisma.UserDepartmentWhereInput = {
      departmentId,
    };

    if (includeChildren) {
      const allDepartmentIds =
        await this.getAllChildDepartmentIds(departmentId);
      where.departmentId = { in: allDepartmentIds };
    }

    const [items, total] = await Promise.all([
      this.prisma.userDepartment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatar: true,
                },
              },
              email: true,
            },
          },
        },
      }),
      this.prisma.userDepartment.count({ where }),
    ]);

    return { items, total };
  }

  private async getAllChildDepartmentIds(parentId: string): Promise<string[]> {
    const ids: string[] = [parentId];
    const children = await this.findChildren(parentId);

    for (const child of children) {
      ids.push(...(await this.getAllChildDepartmentIds(child.id)));
    }

    return ids;
  }

  async hasChildren(departmentId: string): Promise<boolean> {
    const count = await this.prisma.department.count({
      where: {
        parentId: departmentId,
        deletedAt: null,
      },
    });

    return count > 0;
  }

  async hasMembers(
    departmentId: string,
    includeChildren: boolean = false,
  ): Promise<boolean> {
    const where: Prisma.UserDepartmentWhereInput = {
      departmentId,
    };

    if (includeChildren) {
      const allDepartmentIds =
        await this.getAllChildDepartmentIds(departmentId);
      where.departmentId = { in: allDepartmentIds };
    }

    const count = await this.prisma.userDepartment.count({ where });

    return count > 0;
  }

  async update(
    id: string,
    data: Prisma.DepartmentUpdateInput,
  ): Promise<Department> {
    return this.prisma.department.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id: string, active: boolean): Promise<Department> {
    return this.prisma.department.update({
      where: { id },
      data: { active },
    });
  }

  async move(
    id: string,
    parentId: string | null,
    sortOrder?: number,
  ): Promise<Department> {
    return this.prisma.department.update({
      where: { id },
      data: {
        parentId,
        sortOrder,
      },
    });
  }

  async delete(id: string): Promise<Department> {
    return this.prisma.department.delete({
      where: { id },
    });
  }

  async softDelete(id: string): Promise<Department> {
    return this.prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
