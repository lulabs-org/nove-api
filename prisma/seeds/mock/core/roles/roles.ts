/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 01:46:42
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 02:32:34
 * @FilePath: /nove_api/prisma/seeds/mock/core/roles/roles.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { PrismaClient, Role } from '@prisma/client';
import { ROLE_CONFIGS } from './config';
import type { RoleConfig, CreatedRoles } from './type';

async function upsertRole(
  prisma: PrismaClient,
  config: RoleConfig,
): Promise<Role> {
  return prisma.role.upsert({
    where: { code: config.code },
    update: {},
    create: {
      name: config.name,
      code: config.code,
      description: config.description,
      level: config.level,
      type: config.type,
    },
  });
}

export async function createRoles(prisma: PrismaClient): Promise<CreatedRoles> {
  const rolePromises = ROLE_CONFIGS.map((config) => upsertRole(prisma, config));
  const roles = await Promise.all(rolePromises);

  return ROLE_CONFIGS.reduce((acc, config, index) => {
    acc[config.key] = roles[index];
    return acc;
  }, {} as CreatedRoles);
}
