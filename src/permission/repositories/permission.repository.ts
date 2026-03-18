import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionType, Permission } from '@prisma/client';

interface PermissionWithChildren extends Permission {
  parent: Permission | null;
  children: PermissionWithChildren[];
}

@Injectable()
export class PermRepository {
  private readonly logger = new Logger(PermRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findRolesByCodes(roleCodes: string[]) {
    return this.prisma.role.findMany({
      where: {
        code: {
          in: roleCodes,
        },
        active: true,
      },
      include: {
        permissions: {
          where: {
            permission: {
              active: true,
            },
          },
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async findUserRoles(userId: string) {
    const orgMembers = await this.prisma.orgMember.findMany({
      where: { userId },
      include: {
        memberRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return orgMembers.flatMap((orgMember) =>
      orgMember.memberRoles.map((mr) => ({
        id: mr.id,
        userId: orgMember.userId,
        roleId: mr.roleId,
        role: mr.role,
      })),
    );
  }

  async findAll() {
    return this.prisma.permission.findMany({
      where: {
        active: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        resource: true,
        action: true,
        type: true,
      },
      orderBy: [
        {
          type: 'asc',
        },
        {
          resource: 'asc',
        },
        {
          action: 'asc',
        },
      ],
    });
  }

  async findByResource(resource: string) {
    return this.prisma.permission.findMany({
      where: {
        resource,
        active: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        action: true,
        type: true,
      },
      orderBy: [
        {
          type: 'asc',
        },
        {
          action: 'asc',
        },
      ],
    });
  }

  async findById(id: string) {
    return this.prisma.permission.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async findByCode(code: string) {
    return this.prisma.permission.findUnique({
      where: { code },
    });
  }

  async findMany(options?: {
    skip?: number;
    take?: number;
    where?: {
      name?: { contains: string };
      code?: string;
      resource?: string;
      type?: PermissionType;
      parentId?: string;
      active?: boolean;
    };
    orderBy?: {
      createdAt?: 'asc' | 'desc';
      sortOrder?: 'asc' | 'desc';
    };
  }) {
    const { skip, take, where, orderBy } = options || {};

    const [items, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { sortOrder: 'asc' },
        include: {
          parent: true,
          children: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      this.prisma.permission.count({ where }),
    ]);

    return { items, total };
  }

  async create(data: {
    name: string;
    code: string;
    description?: string;
    resource: string;
    action: string;
    type?: PermissionType;
    parentId?: string;
    level?: number;
    sortOrder?: number;
    active?: boolean;
  }) {
    return this.prisma.permission.create({
      data,
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      resource?: string;
      action?: string;
      type?: PermissionType;
      parentId?: string;
      level?: number;
      sortOrder?: number;
      active?: boolean;
    },
  ) {
    return this.prisma.permission.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.permission.delete({
      where: { id },
    });
  }

  async checkCodeExists(code: string, excludeId?: string) {
    const permission = await this.prisma.permission.findFirst({
      where: {
        code,
        id: excludeId ? { not: excludeId } : undefined,
      },
    });

    return !!permission;
  }

  async findTree() {
    const permissions = await this.prisma.permission.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        parent: true,
        children: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    const map = new Map<string, PermissionWithChildren>(
      permissions.map((p) => [p.id, { ...p, children: [] }]),
    );

    const tree: PermissionWithChildren[] = [];

    for (const permission of permissions) {
      const node = map.get(permission.id);
      if (!node) continue;

      if (permission.parentId) {
        const parent = map.get(permission.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        tree.push(node);
      }
    }

    return tree;
  }

  async findDataPermissionRules(options?: {
    skip?: number;
    take?: number;
    where?: {
      name?: { contains: string };
      code?: string;
      resource?: string;
      active?: boolean;
    };
    orderBy?: {
      createdAt?: 'asc' | 'desc';
    };
  }) {
    const { skip, take, where, orderBy } = options || {};

    const [items, total] = await Promise.all([
      this.prisma.dataPermissionRule.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { createdAt: 'desc' },
      }),
      this.prisma.dataPermissionRule.count({ where }),
    ]);

    return { items, total };
  }

  async findDataPermissionRuleById(id: string) {
    return this.prisma.dataPermissionRule.findUnique({
      where: { id },
    });
  }

  async findDataPermissionRuleByCode(code: string) {
    return this.prisma.dataPermissionRule.findUnique({
      where: { code },
    });
  }

  async createDataPermissionRule(data: {
    name: string;
    code: string;
    description?: string;
    resource: string;
    condition: string;
    active?: boolean;
  }) {
    return this.prisma.dataPermissionRule.create({
      data,
    });
  }

  async updateDataPermissionRule(
    id: string,
    data: {
      name?: string;
      description?: string;
      resource?: string;
      condition?: string;
      active?: boolean;
    },
  ) {
    return this.prisma.dataPermissionRule.update({
      where: { id },
      data,
    });
  }

  async deleteDataPermissionRule(id: string) {
    return this.prisma.dataPermissionRule.delete({
      where: { id },
    });
  }

  async checkDataPermissionRuleCodeExists(code: string, excludeId?: string) {
    const rule = await this.prisma.dataPermissionRule.findFirst({
      where: {
        code,
        id: excludeId ? { not: excludeId } : undefined,
      },
    });

    return !!rule;
  }
}
