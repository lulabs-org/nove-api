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
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: true,
      },
      orderBy: {
        role: {
          level: 'asc',
        },
      },
    });

    return userRoles
      .filter((ur) => ur.role && !ur.role.isDeleted && ur.role.active)
      .map((ur) => ({
        id: ur.role.id,
        code: ur.role.code,
        name: ur.role.name,
        type: ur.role.type,
        level: ur.role.level,
      }));
  }

  async hasAnyRole(userId: string, roleCodes: string[]): Promise<boolean> {
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          code: { in: roleCodes },
          isDeleted: false,
          active: true,
        },
      },
      include: {
        role: true,
      },
    });

    return !!userRole;
  }

  async hasAllRoles(userId: string, roleCodes: string[]): Promise<boolean> {
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        role: {
          code: { in: roleCodes },
          isDeleted: false,
          active: true,
        },
      },
      include: {
        role: true,
      },
    });

    const userRoleCodes = new Set(userRoles.map((ur) => ur.role.code));
    return roleCodes.every((code) => userRoleCodes.has(code));
  }
}
