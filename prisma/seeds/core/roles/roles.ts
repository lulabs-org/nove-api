/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 01:46:42
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-15 19:41:23
 * @FilePath: /nove_api/prisma/seeds/core/roles/roles.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { PrismaClient, Role } from '@prisma/client';
import { ROLE_CONFIGS, REAL_ROLE_CONFIGS } from './config';
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

export async function createRoles(
  prisma: PrismaClient,
  useRealData = false,
  orgId: string,
): Promise<Role[]> {
  const dataSource = useRealData ? '真实数据' : '模拟数据';
  console.log(`🔐 开始创建角色数据，使用${dataSource}...`);

  const roleConfigs = useRealData ? REAL_ROLE_CONFIGS : ROLE_CONFIGS;
  const rolePromises = roleConfigs.map((config) =>
    upsertRole(prisma, { ...config, orgId }),
  );
  const roles = await Promise.all(rolePromises);

  return roles;
}
