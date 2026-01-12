import { PrismaClient, Permission } from '@prisma/client';
import { createPermissions as createPermissionsOnly } from './permissions';
import { createRoles, CreatedRoles } from '../core/roles';
import { assignRolePermissions } from '../relations/permission-relations/role-permissions';

export interface CreatedPermissions {
  permissions: Permission[];
  roles: CreatedRoles;
}

export async function createPermissions(
  prisma: PrismaClient,
): Promise<CreatedPermissions> {
  const permissions = await createPermissionsOnly(prisma);
  const roles = await createRoles(prisma);
  await assignRolePermissions(prisma, permissions, roles);

  return {
    permissions,
    roles,
  };
}

export { createPermissions as createPermissionsOnly } from './permissions';
export { createRoles, type CreatedRoles } from '../core/roles';
