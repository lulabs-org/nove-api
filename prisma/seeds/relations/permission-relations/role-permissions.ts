import { PrismaClient, Permission, Role } from '@prisma/client';

// 管理员角色排除的权限列表
const ADMIN_EXCLUDED_PERMISSIONS = ['system:config'];

// 经理角色权限列表
const MANAGER_PERMISSIONS = [
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
];

// 财务角色权限列表
const FINANCE_PERMISSIONS = [
  'finance:read',
  'finance:export',
  'finance:audit',
  'order:read',
  'dashboard:read',
];

// 客服角色权限列表
const CUSTOMER_SERVICE_PERMISSIONS = [
  'user:read',
  'order:read',
  'order:update',
  'order:status',
  'product:read',
  'dashboard:read',
];

// 普通用户角色权限列表
const USER_PERMISSIONS = ['dashboard:read', 'product:read', 'order:read'];

/**
 * 为指定角色分配权限
 * @param prisma Prisma 客户端实例
 * @param roleId 角色ID
 * @param permissions 权限列表
 */
export async function assignPermissionsToRole(
  prisma: PrismaClient,
  roleId: string,
  permissions: Permission[],
): Promise<void> {
  const rolePermissions = permissions.map((permission) => ({
    roleId,
    permissionId: permission.id,
  }));

  for (const rolePermission of rolePermissions) {
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

/**
 * 为所有角色分配对应的权限
 * @param prisma Prisma 客户端实例
 * @param permissions 所有可用权限列表
 * @param roles 所有角色列表
 */
export async function assignRolePermissions(
  prisma: PrismaClient,
  permissions: Permission[],
  roles: Role[],
): Promise<void> {
  const superAdminRoleId =
    roles.find((role) => role.code === 'SUPER_ADMIN')?.id || '';
  await assignPermissionsToRole(prisma, superAdminRoleId, permissions);

  const adminRoleId = roles.find((role) => role.code === 'ADMIN')?.id || '';
  const adminPermissions = permissions.filter(
    (p) => !ADMIN_EXCLUDED_PERMISSIONS.includes(p.code),
  );
  await assignPermissionsToRole(prisma, adminRoleId, adminPermissions);

  const managerRoleId = roles.find((role) => role.code === 'MANAGER')?.id || '';
  const managerPermissions = permissions.filter((p) =>
    MANAGER_PERMISSIONS.includes(p.code),
  );
  await assignPermissionsToRole(prisma, managerRoleId, managerPermissions);

  const financeRoleId = roles.find((role) => role.code === 'FINANCE')?.id || '';
  const financePermissions = permissions.filter((p) =>
    FINANCE_PERMISSIONS.includes(p.code),
  );
  await assignPermissionsToRole(prisma, financeRoleId, financePermissions);

  const customerServiceRoleId =
    roles.find((role) => role.code === 'CUSTOMER_SERVICE')?.id || '';
  const customerServicePermissions = permissions.filter((p) =>
    CUSTOMER_SERVICE_PERMISSIONS.includes(p.code),
  );
  await assignPermissionsToRole(
    prisma,
    customerServiceRoleId,
    customerServicePermissions,
  );

  const userRoleId = roles.find((role) => role.code === 'USER')?.id || '';
  const userPermissions = permissions.filter((p) =>
    USER_PERMISSIONS.includes(p.code),
  );
  await assignPermissionsToRole(prisma, userRoleId, userPermissions);
}
