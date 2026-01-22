import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RoleType } from '@prisma/client';

@Injectable()
export class RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    code: string;
    description?: string;
    type: RoleType;
    level: number;
    active: boolean;
    orgId: string;
  }) {
    return this.prisma.role.create({
      data,
    });
  }

  async findById(id: string) {
    return this.prisma.role.findFirst({
      where: { id, isDeleted: false },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async findByCode(code: string) {
    return this.prisma.role.findFirst({
      where: { code, isDeleted: false },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async findMany(options?: {
    skip?: number;
    take?: number;
    where?: {
      name?: { contains: string };
      code?: string;
      type?: RoleType;
      active?: boolean;
    };
    orderBy?: {
      createdAt?: 'asc' | 'desc';
      name?: 'asc' | 'desc';
      level?: 'asc' | 'desc';
    };
  }) {
    const { skip, take, where, orderBy } = options || {};

    const [items, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { createdAt: 'desc' },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      }),
      this.prisma.role.count({ where }),
    ]);

    return { items, total };
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      level?: number;
      active?: boolean;
    },
  ) {
    return this.prisma.role.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.role.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });
  }

  async updatePermissions(id: string, permissionIds: string[]) {
    return this.prisma.role.update({
      where: { id },
      data: {
        permissions: {
          deleteMany: {},
          create: permissionIds.map((permissionId) => ({
            permissionId,
          })),
        },
      },
    });
  }

  async checkCodeExists(code: string, excludeId?: string) {
    const role = await this.prisma.role.findFirst({
      where: {
        code,
        id: excludeId ? { not: excludeId } : undefined,
        isDeleted: false,
      },
    });

    return !!role;
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

    const roles = orgMembers.flatMap((orgMember) =>
      orgMember.memberRoles
        .filter((mr) => mr.role && !mr.role.isDeleted && mr.role.active)
        .map((mr) => ({
          id: mr.role.id,
          code: mr.role.code,
          name: mr.role.name,
          type: mr.role.type,
          level: mr.role.level,
        })),
    );

    return roles;
  }

  async hasAnyRole(userId: string, roleCodes: string[]): Promise<boolean> {
    const orgMember = await this.prisma.orgMember.findFirst({
      where: {
        userId,
        memberRoles: {
          some: {
            role: {
              code: { in: roleCodes },
              isDeleted: false,
              active: true,
            },
          },
        },
      },
      include: {
        memberRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return !!orgMember;
  }

  async hasAllRoles(userId: string, roleCodes: string[]): Promise<boolean> {
    const orgMembers = await this.prisma.orgMember.findMany({
      where: {
        userId,
        memberRoles: {
          some: {
            role: {
              code: { in: roleCodes },
              isDeleted: false,
              active: true,
            },
          },
        },
      },
      include: {
        memberRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    const userRoleCodes = new Set(
      orgMembers.flatMap((orgMember) =>
        orgMember.memberRoles
          .filter((mr) => mr.role && !mr.role.isDeleted && mr.role.active)
          .map((mr) => mr.role.code),
      ),
    );
    return roleCodes.every((code) => userRoleCodes.has(code));
  }

  async setRolePermissionsByKeys(roleId: string, permissionKeys: string[]) {
    const permissions = await this.prisma.permission.findMany({
      where: {
        code: { in: permissionKeys },
      },
    });

    const permissionIds = permissions.map((p) => p.id);

    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: {
          deleteMany: {},
          create: permissionIds.map((permissionId) => ({
            permissionId,
          })),
        },
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async createRoleBinding(data: {
    roleId: string;
    membershipId: string;
    deptId?: string;
  }) {
    return this.prisma.memberRole.create({
      data: {
        roleId: data.roleId,
        memberId: data.membershipId,
      },
      include: {
        role: true,
        member: true,
      },
    });
  }

  async deleteRoleBinding(bindingId: string) {
    return this.prisma.memberRole.delete({
      where: { id: bindingId },
    });
  }

  async findRoleBindingById(bindingId: string) {
    return this.prisma.memberRole.findUnique({
      where: { id: bindingId },
      include: {
        role: true,
        member: true,
      },
    });
  }
}
