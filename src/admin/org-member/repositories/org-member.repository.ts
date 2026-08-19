import { Injectable } from '@nestjs/common';
import { OrgMember, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

const orgMemberListSelect = {
  id: true,
  userId: true,
  type: true,
  status: true,
  orgDisplayName: true,
  employeeNo: true,
  title: true,
  joinedAt: true,
  user: {
    select: {
      username: true,
      email: true,
      countryCode: true,
      phone: true,
      profile: { select: { displayName: true, avatar: true } },
    },
  },
  primaryDept: { select: { id: true, name: true } },
} satisfies Prisma.OrgMemberSelect;

const memberRoleOptionSelect = {
  id: true,
  userId: true,
  orgDisplayName: true,
  user: {
    select: {
      username: true,
      email: true,
      profile: { select: { displayName: true, avatar: true } },
    },
  },
  primaryDept: { select: { name: true } },
  memberDepartments: {
    where: { deletedAt: null },
    select: { dept: { select: { name: true } } },
  },
  memberRoles: {
    where: { deletedAt: null },
    select: { roleId: true },
  },
} satisfies Prisma.OrgMemberSelect;

export type OrgMemberListRecord = Prisma.OrgMemberGetPayload<{
  select: typeof orgMemberListSelect;
}>;
export type MemberRoleOptionRecord = Prisma.OrgMemberGetPayload<{
  select: typeof memberRoleOptionSelect;
}>;

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

  async findList(options: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.OrgMemberOrderByWithRelationInput;
    where: Prisma.OrgMemberWhereInput;
  }): Promise<{ items: OrgMemberListRecord[]; total: number }> {
    const { skip, take, orderBy, where } = options;
    const [items, total] = await Promise.all([
      this.prisma.orgMember.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { createdAt: 'desc' },
        select: orgMemberListSelect,
      }),
      this.prisma.orgMember.count({ where }),
    ]);

    return { items, total };
  }

  async findMemberRoleOptions(options: {
    skip: number;
    take: number;
    where: Prisma.OrgMemberWhereInput;
  }): Promise<{ items: MemberRoleOptionRecord[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.orgMember.findMany({
        where: options.where,
        skip: options.skip,
        take: options.take,
        orderBy: { createdAt: 'desc' },
        select: memberRoleOptionSelect,
      }),
      this.prisma.orgMember.count({ where: options.where }),
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
            countryCode: true,
            phone: true,
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

  async getDepartmentIds(
    orgId: string,
    parentId: string,
    includeChildren: boolean,
  ): Promise<string[]> {
    const parent = await this.prisma.dept.findFirst({
      where: { id: parentId, orgId, deletedAt: null },
      select: { id: true },
    });
    if (!parent) return [];
    if (!includeChildren) return [parentId];
    return [parentId, ...(await this.getChildDepartmentIds(orgId, parentId))];
  }

  private async getChildDepartmentIds(
    orgId: string,
    parentId: string,
  ): Promise<string[]> {
    const ids: string[] = [];
    const children = await this.prisma.dept.findMany({
      where: {
        orgId,
        parentId,
        deletedAt: null,
      },
      select: { id: true },
    });

    for (const child of children) {
      ids.push(
        child.id,
        ...(await this.getChildDepartmentIds(orgId, child.id)),
      );
    }

    return ids;
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
