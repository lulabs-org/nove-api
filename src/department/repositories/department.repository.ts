import { Injectable } from '@nestjs/common';
import { Dept, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DepartmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.DeptCreateInput): Promise<Dept> {
    return this.prisma.dept.create({
      data,
    });
  }

  async findById(id: string): Promise<Dept | null> {
    return this.prisma.dept.findUnique({
      where: { id },
    });
  }

  async findByCode(code: string): Promise<Dept | null> {
    return this.prisma.dept.findUnique({
      where: { code },
    });
  }

  async findByOrganizationId(
    organizationId: string,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.DeptOrderByWithRelationInput;
      where?: Prisma.DeptWhereInput;
    },
  ): Promise<{ items: Dept[]; total: number }> {
    const { skip, take, orderBy, where } = options || {};

    const baseWhere: Prisma.DeptWhereInput = {
      orgId: organizationId,
      deletedAt: null,
      ...where,
    };

    const [items, total] = await Promise.all([
      this.prisma.dept.findMany({
        where: baseWhere,
        skip,
        take,
        orderBy: orderBy || { sortOrder: 'asc', createdAt: 'desc' },
      }),
      this.prisma.dept.count({ where: baseWhere }),
    ]);

    return { items, total };
  }

  async findTree(organizationId: string): Promise<Dept[]> {
    const departments = await this.prisma.dept.findMany({
      where: {
        orgId: organizationId,
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc', createdAt: 'desc' },
    });

    return this.buildTree(departments);
  }

  private buildTree(
    departments: Dept[],
    parentId: string | null = null,
  ): Dept[] {
    return departments
      .filter((dept) => dept.parentId === parentId)
      .map((dept) => ({
        ...dept,
        children: this.buildTree(departments, dept.id),
      }));
  }

  async findChildren(parentId: string): Promise<Dept[]> {
    return this.prisma.dept.findMany({
      where: {
        parentId,
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc', createdAt: 'desc' },
    });
  }

  async findAncestors(departmentId: string): Promise<Dept[]> {
    const ancestors: Dept[] = [];
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

    const where: Prisma.MemberDepartmentWhereInput = {
      deptId: departmentId,
    };

    if (includeChildren) {
      const allDepartmentIds =
        await this.getAllChildDepartmentIds(departmentId);
      where.deptId = { in: allDepartmentIds };
    }

    const [items, total] = await Promise.all([
      this.prisma.memberDepartment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          member: {
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
          },
        },
      }),
      this.prisma.memberDepartment.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        user: item.member.user,
        isPrimary: item.isPrimary,
        createdAt: item.createdAt,
      })),
      total,
    };
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
    const count = await this.prisma.dept.count({
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
    const where: Prisma.MemberDepartmentWhereInput = {
      deptId: departmentId,
    };

    if (includeChildren) {
      const allDepartmentIds =
        await this.getAllChildDepartmentIds(departmentId);
      where.deptId = { in: allDepartmentIds };
    }

    const count = await this.prisma.memberDepartment.count({ where });

    return count > 0;
  }

  async update(id: string, data: Prisma.DeptUpdateInput): Promise<Dept> {
    return this.prisma.dept.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id: string, active: boolean): Promise<Dept> {
    return this.prisma.dept.update({
      where: { id },
      data: { active },
    });
  }

  async move(
    id: string,
    parentId: string | null,
    sortOrder?: number,
  ): Promise<Dept> {
    return this.prisma.dept.update({
      where: { id },
      data: {
        parentId,
        sortOrder,
      },
    });
  }

  async delete(id: string): Promise<Dept> {
    return this.prisma.dept.delete({
      where: { id },
    });
  }

  async softDelete(id: string): Promise<Dept> {
    return this.prisma.dept.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
