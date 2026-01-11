/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 00:22:09
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 00:32:26
 * @FilePath: /nove_api/prisma/seeds/mock/permissions/index.ts
 * @Description: 权限模块，包含权限、角色和角色权限的创建和分配
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { PrismaClient, Permission } from '@prisma/client';
import { createPermissions as createPermissionsOnly } from './permissions';
import { createRoles, CreatedRoles } from './roles';
import { assignRolePermissions } from './role-permissions';

export interface CreatedPermissions {
  permissions: Permission[];
  roles: CreatedRoles;
}

export async function createPermissions(
  prisma: PrismaClient,
): Promise<CreatedPermissions> {
  // 创建所有权限
  const permissions = await createPermissionsOnly(prisma);
  // 创建所有角色
  const roles = await createRoles(prisma);
  // 为角色分配权限
  await assignRolePermissions(prisma, permissions, roles);

  return {
    permissions,
    roles,
  };
}

// 导出各个子模块的函数和类型，以便单独使用
export { createPermissions as createPermissionsOnly } from './permissions';
export { createRoles, type CreatedRoles } from './roles';
export { assignRolePermissions } from './role-permissions';
