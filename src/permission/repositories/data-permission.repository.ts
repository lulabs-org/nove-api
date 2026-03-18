/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-19 04:53:27
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-19 04:55:48
 * @FilePath: /nove_api/src/permission/repositories/data-permission.repository.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DataPermissionRepository {
  private readonly logger = new Logger(DataPermissionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByResource(options?: {
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

  async findById(id: string) {
    return this.prisma.dataPermissionRule.findUnique({
      where: { id },
    });
  }

  async findByCode(code: string) {
    return this.prisma.dataPermissionRule.findUnique({
      where: { code },
    });
  }

  async create(data: {
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

  async update(
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

  async delete(id: string) {
    return this.prisma.dataPermissionRule.delete({
      where: { id },
    });
  }

  async checkCodeExists(code: string, excludeId?: string) {
    const rule = await this.prisma.dataPermissionRule.findFirst({
      where: {
        code,
        id: excludeId ? { not: excludeId } : undefined,
      },
    });

    return !!rule;
  }
}
