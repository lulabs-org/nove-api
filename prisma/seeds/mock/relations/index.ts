import { PrismaClient } from '@prisma/client';
import type { CreatedUsers } from '../users';
import type { RoleMap, CreateAllRelationsParams } from './config';
import { createUserOrganizationRelations } from './user-organization';
import { createRolePermissionRelations } from './role-permission';
import { createUserPermissionRelations } from './user-permission';
import { createDataPermissionRelations } from './data-permission';

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
export type { RoleMap, CreateAllRelationsParams } from './config';
