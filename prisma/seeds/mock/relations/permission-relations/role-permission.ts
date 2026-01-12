import { PrismaClient } from '@prisma/client';
import type { RoleMap } from '../config';

export async function createRolePermissionRelations(
  prisma: PrismaClient,
  roles: RoleMap,
): Promise<void> {
  try {
    const permissions = await prisma.permission.findMany();

    if (permissions.length === 0) {
      console.log('No permissions found, skipping role permission relations');
      return;
    }

    const adminPermissions = permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roles.admin.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: roles.admin.id,
          permissionId: permission.id,
        },
      }),
    );

    const financePermissions = permissions
      .filter(
        (p) =>
          p.code.includes('FINANCE') ||
          p.code.includes('ORDER') ||
          p.code.includes('REFUND') ||
          p.code.includes('REPORT'),
      )
      .map((permission) =>
        prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: roles.finance.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: roles.finance.id,
            permissionId: permission.id,
          },
        }),
      );

    const customerServicePermissions = permissions
      .filter(
        (p) =>
          p.code.includes('CUSTOMER') ||
          p.code.includes('ORDER') ||
          p.code.includes('REFUND') ||
          p.code.includes('USER_READ'),
      )
      .map((permission) =>
        prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: roles.customerService.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: roles.customerService.id,
            permissionId: permission.id,
          },
        }),
      );

    const userPermissions = permissions
      .filter((p) => p.code.includes('READ') && !p.code.includes('ADMIN'))
      .map((permission) =>
        prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: roles.user.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: roles.user.id,
            permissionId: permission.id,
          },
        }),
      );

    await Promise.all([
      ...adminPermissions,
      ...financePermissions,
      ...customerServicePermissions,
      ...userPermissions,
    ]);
  } catch (error) {
    console.error('Failed to create role permission relations:', error);
    throw error;
  }
}
