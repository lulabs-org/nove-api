/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 01:00:17
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 01:44:19
 * @FilePath: /nove_api/prisma/seeds/mock/relations/index.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */
import { PrismaClient } from '@prisma/client';
import type { CreatedUsers } from '../users';
import type { RoleMap, CreateAllRelationsParams } from './config';
import { createUserOrganizationRelations } from './user-organization';
import { createRolePermissionRelations } from './role-permission';
import { createUserPermissionRelations } from './user-permission';
import { createDataPermissionRelations } from './data-permission';
import { assignRolePermissions } from './role-permissions';
import { createUserDepartmentRelations } from './user-department';
import { assignUserRoles, assignRolesToUsers } from './user-roles';

export async function createAllRelations(
  prisma: PrismaClient,
  organizationId: string,
  users: CreatedUsers,
  roles: RoleMap,
): Promise<void> {
  try {
    console.log('Creating user organization relations...');
    await createUserOrganizationRelations(prisma, organizationId, users);

    console.log('Creating role permission relations...');
    await createRolePermissionRelations(prisma, roles);

    console.log('Creating user permission relations...');
    await createUserPermissionRelations(prisma, users);

    console.log('Creating data permission relations...');
    await createDataPermissionRelations(prisma, roles, users);

    console.log('All relations created successfully!');
  } catch (error) {
    console.error('Failed to create all relations:', error);
    throw error;
  }
}

export { createUserOrganizationRelations } from './user-organization';
export { createRolePermissionRelations } from './role-permission';
export { createUserPermissionRelations } from './user-permission';
export { createDataPermissionRelations } from './data-permission';
export { assignRolePermissions } from './role-permissions';
export { createUserDepartmentRelations } from './user-department';
export { assignUserRoles, assignRolesToUsers } from './user-roles';
export type { RoleMap, CreateAllRelationsParams } from './config';
