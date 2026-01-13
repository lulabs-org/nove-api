/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 01:46:42
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-13 14:16:46
 * @FilePath: /lulab_backend/prisma/seeds/mock/core/roles/roles.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { PrismaClient, Role } from '@prisma/client';
import { ROLE_CONFIGS } from './config';
import { RoleConfig } from './type';

async function upsertRole(
  prisma: PrismaClient,
  config: RoleConfig,
): Promise<Role> {
  const role = await prisma.role.upsert({
    where: { code: config.code },
    update: {},
    create: config,
  });

  console.log(
    `✅ 创建角色: ${role.name}${role.type ? ` (类型: ${role.type})` : ''}`,
  );

  return role;
}

export async function createRoles(prisma: PrismaClient): Promise<Role[]> {
  console.log('🔐 开始创建角色数据...');
  const rolePromises = ROLE_CONFIGS.map((config) => upsertRole(prisma, config));
  const roles = await Promise.all(rolePromises);
  return roles;
}
