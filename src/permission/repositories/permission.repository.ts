/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-09 02:44:02
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-09 02:44:48
 * @FilePath: /lulab_backend/src/permission/repositories/permission.repository.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionRepository {
  private readonly logger = new Logger(PermissionRepository.name);

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
    return this.prisma.userRole.findMany({
      where: {
        userId,
      },
      include: {
        role: true,
      },
    });
  }

  async findAllPermissions() {
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

  async findPermissionsByResource(resource: string) {
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
}
