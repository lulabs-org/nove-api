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

/**
 * 组织成员仓储类
 * 负责处理组织成员相关的数据持久化与查询操作
 */
@Injectable()
export class OrgMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建组织成员
   * @param data 成员创建数据
   */
  async create(data: Prisma.OrgMemberCreateInput): Promise<OrgMember> {
    return this.prisma.orgMember.create({
      data,
    });
  }

  /**
   * 根据 ID 查询组织成员
   * @param id 成员 ID
   */
  async findById(id: string): Promise<OrgMember | null> {
    return this.prisma.orgMember.findUnique({
      where: { id },
    });
  }

  /**
   * 根据组织 ID 和用户 ID 查询成员
   * @param orgId 组织 ID
   * @param userId 用户 ID
   */
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

  /**
   * 根据工号查询组织成员
   * @param orgId 组织 ID
   * @param employeeNo 工号
   */
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

  /**
   * 分页查询组织成员列表
   * @param options 查询条件与分页参数
   */
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

  /**
   * 分页查询角色成员选项（用于分配角色时的成员列表）
   * @param options 查询条件与分页参数
   */
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

  /**
   * 获取成员详细信息（包含用户资料、主部门、所属部门、角色等关联数据）
   * @param id 成员 ID
   */
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

  /**
   * 获取指定部门及其子部门（可选）的 ID 集合
   * @param orgId 组织 ID
   * @param parentId 部门 ID
   * @param includeChildren 是否包含所有子代部门
   */
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

  /**
   * 递归获取所有子代部门的 ID（内部使用，存在性能瓶颈，建议优化为内存树或 CTE）
   * @param orgId 组织 ID
   * @param parentId 父部门 ID
   */
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

  /**
   * 更新成员基本信息
   * @param id 成员 ID
   * @param data 更新数据
   */
  async update(
    id: string,
    data: Prisma.OrgMemberUpdateInput,
  ): Promise<OrgMember> {
    return this.prisma.orgMember.update({
      where: { id },
      data,
    });
  }

  /**
   * 更新成员状态
   * @param id 成员 ID
   * @param status 新状态
   */
  async updateStatus(
    id: string,
    status: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'LEFT',
  ): Promise<OrgMember> {
    return this.prisma.orgMember.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * 硬删除组织成员
   * @param id 成员 ID
   */
  async delete(id: string): Promise<OrgMember> {
    return this.prisma.orgMember.delete({
      where: { id },
    });
  }

  /**
   * 软删除组织成员（设置 deletedAt）
   * @param id 成员 ID
   */
  async softDelete(id: string): Promise<OrgMember> {
    return this.prisma.orgMember.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * 统计组织下的有效成员总数
   * @param orgId 组织 ID
   */
  async countByOrgId(orgId: string): Promise<number> {
    return this.prisma.orgMember.count({
      where: {
        orgId,
        deletedAt: null,
      },
    });
  }

  /**
   * 按照状态统计组织成员数量
   * @param orgId 组织 ID
   * @param status 成员状态
   */
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

  /**
   * 按照类型统计组织成员数量
   * @param orgId 组织 ID
   * @param type 成员类型
   */
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
