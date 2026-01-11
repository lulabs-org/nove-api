import { PrismaClient, Permission } from '@prisma/client';
import { CreatedRoles } from '../roles';

export async function assignRolePermissions(
  prisma: PrismaClient,
  permissions: Permission[],
  roles: CreatedRoles,
): Promise<void> {
  const superAdminRolePermissions = permissions.map((permission) => ({
    roleId: roles.superAdmin.id,
    permissionId: permission.id,
  }));

  for (const rolePermission of superAdminRolePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: rolePermission.roleId,
          permissionId: rolePermission.permissionId,
        },
      },
      update: {},
      create: rolePermission,
    });
  }

  const adminPermissions = permissions.filter(
    (p) => !['system:config'].includes(p.code),
  );
  const adminRolePermissions = adminPermissions.map((permission) => ({
    roleId: roles.admin.id,
    permissionId: permission.id,
  }));

  for (const rolePermission of adminRolePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: rolePermission.roleId,
          permissionId: rolePermission.permissionId,
        },
      },
      update: {},
      create: rolePermission,
    });
  }

  const managerPermissions = permissions.filter((p) =>
    [
      'user:read',
      'user:create',
      'user:update',
      'department:read',
      'department:create',
      'department:update',
      'product:read',
      'product:create',
      'product:update',
      'order:read',
      'order:create',
      'order:update',
      'order:status',
      'dashboard:read',
    ].includes(p.code),
  );
  const managerRolePermissions = managerPermissions.map((permission) => ({
    roleId: roles.manager.id,
    permissionId: permission.id,
  }));

  for (const rolePermission of managerRolePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: rolePermission.roleId,
          permissionId: rolePermission.permissionId,
        },
      },
      update: {},
      create: rolePermission,
    });
  }

  const financePermissions = permissions.filter((p) =>
    [
      'finance:read',
      'finance:export',
      'finance:audit',
      'order:read',
      'dashboard:read',
    ].includes(p.code),
  );
  const financeRolePermissions = financePermissions.map((permission) => ({
    roleId: roles.finance.id,
    permissionId: permission.id,
  }));

  for (const rolePermission of financeRolePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: rolePermission.roleId,
          permissionId: rolePermission.permissionId,
        },
      },
      update: {},
      create: rolePermission,
    });
  }

  const customerServicePermissions = permissions.filter((p) =>
    [
      'user:read',
      'order:read',
      'order:update',
      'order:status',
      'product:read',
      'dashboard:read',
    ].includes(p.code),
  );
  const customerServiceRolePermissions = customerServicePermissions.map(
    (permission) => ({
      roleId: roles.customerService.id,
      permissionId: permission.id,
    }),
  );

  for (const rolePermission of customerServiceRolePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: rolePermission.roleId,
          permissionId: rolePermission.permissionId,
        },
      },
      update: {},
      create: rolePermission,
    });
  }

  const userPermissions = permissions.filter((p) =>
    ['dashboard:read', 'product:read', 'order:read'].includes(p.code),
  );
  const userRolePermissions = userPermissions.map((permission) => ({
    roleId: roles.user.id,
    permissionId: permission.id,
  }));

  for (const rolePermission of userRolePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: rolePermission.roleId,
          permissionId: rolePermission.permissionId,
        },
      },
      update: {},
      create: rolePermission,
    });
  }
}
