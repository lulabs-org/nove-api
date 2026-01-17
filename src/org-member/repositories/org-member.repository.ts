import { Injectable } from '@nestjs/common';
import { OrgMember, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class OrgMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.OrgMemberCreateInput): Promise<OrgMember> {
    return this.prisma.orgMember.create({
      data,
    });
  }

  async findById(id: string): Promise<OrgMember | null> {
    return this.prisma.orgMember.findUnique({
      where: { id },
    });
  }

  async findByOrgAndUser(
    orgId: string,
    userId: string,
  ): Promise<OrgMember | null> {
    return this.prisma.orgMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
    });
  }

  async findByEmployeeNo(
    orgId: string,
    employeeNo: string,
  ): Promise<OrgMember | null> {
    return this.prisma.orgMember.findFirst({
      where: {
        orgId,
        employeeNo,
        deletedAt: null,
      },
    });
  }

  async findByOrgId(
    orgId: string,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.OrgMemberOrderByWithRelationInput;
      where?: Prisma.OrgMemberWhereInput;
    },
  ): Promise<{ items: OrgMember[]; total: number }> {
    const { skip, take, orderBy, where } = options || {};

    const baseWhere: Prisma.OrgMemberWhereInput = {
      orgId,
      deletedAt: null,
      ...where,
    };

    const [items, total] = await Promise.all([
      this.prisma.orgMember.findMany({
        where: baseWhere,
        skip,
        take,
        orderBy: orderBy || { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              profile: {
                select: {
                  displayName: true,
                  avatar: true,
                },
              },
            },
          },
          primaryDept: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
      this.prisma.orgMember.count({ where: baseWhere }),
    ]);

    return { items, total };
  }

  async findDetailById(id: string): Promise<OrgMember | null> {
    return this.prisma.orgMember.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatar: true,
              },
            },
          },
        },
        primaryDept: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        memberDepartments: {
          where: { deletedAt: null },
          include: {
            dept: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        memberRoles: {
          where: { deletedAt: null },
          include: {
            role: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });
  }

  async findByDepartmentId(
    deptId: string,
    includeChildren: boolean = false,
    options?: {
      skip?: number;
      take?: number;
    },
  ): Promise<{ items: OrgMember[]; total: number }> {
    const { skip, take } = options || {};

    let departmentIds: string[] = [deptId];

    if (includeChildren) {
      departmentIds = await this.getAllChildDepartmentIds(deptId);
    }

    const where: Prisma.OrgMemberWhereInput = {
      memberDepartments: {
        some: {
          deptId: { in: departmentIds },
          deletedAt: null,
        },
      },
      deletedAt: null,
    };

    const [items, total] = await Promise.all([
      this.prisma.orgMember.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              profile: {
                select: {
                  displayName: true,
                  avatar: true,
                },
              },
            },
          },
          primaryDept: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
      this.prisma.orgMember.count({ where }),
    ]);

    return { items, total };
  }

  private async getAllChildDepartmentIds(parentId: string): Promise<string[]> {
    const ids: string[] = [parentId];
    const children = await this.prisma.dept.findMany({
      where: {
        parentId,
        deletedAt: null,
      },
      select: { id: true },
    });

    for (const child of children) {
      ids.push(...(await this.getAllChildDepartmentIds(child.id)));
    }

    return ids;
  }

  async searchByKeyword(
    orgId: string,
    keyword: string,
    options?: {
      skip?: number;
      take?: number;
    },
  ): Promise<{ items: OrgMember[]; total: number }> {
    const { skip, take } = options || {};

    const where: Prisma.OrgMemberWhereInput = {
      orgId,
      deletedAt: null,
      OR: [
        { orgDisplayName: { contains: keyword, mode: 'insensitive' } },
        { employeeNo: { contains: keyword, mode: 'insensitive' } },
        { user: { username: { contains: keyword, mode: 'insensitive' } } },
        { user: { email: { contains: keyword, mode: 'insensitive' } } },
        {
          user: {
            profile: {
              displayName: { contains: keyword, mode: 'insensitive' },
            },
          },
        },
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.orgMember.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              profile: {
                select: {
                  displayName: true,
                  avatar: true,
                },
              },
            },
          },
          primaryDept: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
      this.prisma.orgMember.count({ where }),
    ]);

    return { items, total };
  }

  async update(
    id: string,
    data: Prisma.OrgMemberUpdateInput,
  ): Promise<OrgMember> {
    return this.prisma.orgMember.update({
      where: { id },
      data,
    });
  }

  async updateStatus(
    id: string,
    status: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'LEFT',
  ): Promise<OrgMember> {
    return this.prisma.orgMember.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string): Promise<OrgMember> {
    return this.prisma.orgMember.delete({
      where: { id },
    });
  }

  async softDelete(id: string): Promise<OrgMember> {
    return this.prisma.orgMember.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async countByOrgId(orgId: string): Promise<number> {
    return this.prisma.orgMember.count({
      where: {
        orgId,
        deletedAt: null,
      },
    });
  }

  async countByStatus(
    orgId: string,
    status: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'LEFT',
  ): Promise<number> {
    return this.prisma.orgMember.count({
      where: {
        orgId,
        status,
        deletedAt: null,
      },
    });
  }

  async countByType(
    orgId: string,
    type: 'INTERNAL' | 'EXTERNAL',
  ): Promise<number> {
    return this.prisma.orgMember.count({
      where: {
        orgId,
        type,
        deletedAt: null,
      },
    });
  }
}
