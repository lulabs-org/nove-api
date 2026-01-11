import { PrismaClient, Permission } from '@prisma/client';
import { CreatedRoles } from './roles';

export async function assignRolePermissions(
  prisma: PrismaClient,
  permissions: Permission[],
  roles: CreatedRoles,
): Promise<void> {
  // 超级管理员：拥有所有权限
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

  // 管理员：拥有除系统配置外的所有权限
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

  // 经理：拥有用户、部门、产品、订单和仪表板的管理权限
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

  // 财务：拥有财务报表、导出、审核以及订单和仪表板的查看权限
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

  // 客服：拥有用户、订单、产品和仪表板的查看及订单更新权限
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

  // 普通用户：拥有仪表板、产品和订单的基础查看权限
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
