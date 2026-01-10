/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-06-20 21:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-03 06:37:28
 * @FilePath: /lulab_backend/prisma/seeds/relations.ts
 * @Description: 关联表种子数据模块
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { PrismaClient } from '@prisma/client';
import { CreatedUsers } from './users';

// 创建用户组织关联数据
export async function createUserOrganizationRelations(
  prisma: PrismaClient,
  organizationId: string,
  users: CreatedUsers,
): Promise<void> {
  // 管理员用户 - 组织关联（主要组织）
  await prisma.userOrganization.upsert({
    where: {
      userId_organizationId: {
        userId: users.adminUser.id,
        organizationId,
      },
    },
    update: {},
    create: {
      userId: users.adminUser.id,
      organizationId,
      isPrimary: true,
    },
  });

  // 财务用户 - 组织关联（主要组织）
  await prisma.userOrganization.upsert({
    where: {
      userId_organizationId: {
        userId: users.financeUser.id,
        organizationId,
      },
    },
    update: {},
    create: {
      userId: users.financeUser.id,
      organizationId,
      isPrimary: true,
    },
  });

  // 客服用户 - 组织关联（主要组织）
  await prisma.userOrganization.upsert({
    where: {
      userId_organizationId: {
        userId: users.customerServiceUser.id,
        organizationId,
      },
    },
    update: {},
    create: {
      userId: users.customerServiceUser.id,
      organizationId,
      isPrimary: true,
    },
  });

  // 普通用户 - 组织关联（主要组织）
  for (const user of users.normalUsers) {
    await prisma.userOrganization.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        organizationId,
        isPrimary: true,
      },
    });
  }
}

// 创建角色权限关联数据
export async function createRolePermissionRelations(
  prisma: PrismaClient,
  roles: {
    admin: { id: string };
    finance: { id: string };
    customerService: { id: string };
    user: { id: string };
  },
): Promise<void> {
  // 获取所有权限
  const permissions = await prisma.permission.findMany();

  if (permissions.length === 0) {
    console.log('No permissions found, skipping role permission relations');
    return;
  }

  // 管理员角色分配所有权限
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
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
    });
  }

  // 财务角色分配财务相关权限
  const financePermissions = permissions.filter(
    (p) =>
      p.code.includes('FINANCE') ||
      p.code.includes('ORDER') ||
      p.code.includes('REFUND') ||
      p.code.includes('REPORT'),
  );

  for (const permission of financePermissions) {
    await prisma.rolePermission.upsert({
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
    });
  }

  // 客服角色分配客服相关权限
  const customerServicePermissions = permissions.filter(
    (p) =>
      p.code.includes('CUSTOMER') ||
      p.code.includes('ORDER') ||
      p.code.includes('REFUND') ||
      p.code.includes('USER_READ'),
  );

  for (const permission of customerServicePermissions) {
    await prisma.rolePermission.upsert({
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
    });
  }

  // 普通用户角色分配基础权限
  const userPermissions = permissions.filter(
    (p) => p.code.includes('READ') && !p.code.includes('ADMIN'),
  );

  for (const permission of userPermissions) {
    await prisma.rolePermission.upsert({
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
    });
  }
}

// 创建用户特殊权限关联数据（示例）
export async function createUserPermissionRelations(
  prisma: PrismaClient,
  users: CreatedUsers,
): Promise<void> {
  // 获取一些权限用于示例
  const permissions = await prisma.permission.findMany({
    take: 3,
  });

  if (permissions.length === 0) {
    console.log('No permissions found, skipping user permission relations');
    return;
  }

  // 给第一个普通用户一些特殊权限
  if (users.normalUsers.length > 0) {
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId: users.normalUsers[0].id,
          permissionId: permissions[0].id,
        },
      },
      update: {},
      create: {
        userId: users.normalUsers[0].id,
        permissionId: permissions[0].id,
        granted: true,
      },
    });
  }

  // 给第二个普通用户拒绝某个权限（示例）
  if (users.normalUsers.length > 1 && permissions.length > 1) {
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId: users.normalUsers[1].id,
          permissionId: permissions[1].id,
        },
      },
      update: {},
      create: {
        userId: users.normalUsers[1].id,
        permissionId: permissions[1].id,
        granted: false,
      },
    });
  }
}

// 创建数据权限关联数据（示例）
export async function createDataPermissionRelations(
  prisma: PrismaClient,
  roles: {
    admin: { id: string };
    finance: { id: string };
  },
  users: CreatedUsers,
): Promise<void> {
  // 获取数据权限规则
  const dataRules = await prisma.dataPermissionRule.findMany();

  if (dataRules.length === 0) {
    console.log(
      'No data permission rules found, skipping data permission relations',
    );
    return;
  }

  // 为管理员角色分配所有数据权限规则
  for (const rule of dataRules) {
    await prisma.roleDataPermission.upsert({
      where: {
        roleId_ruleId: {
          roleId: roles.admin.id,
          ruleId: rule.id,
        },
      },
      update: {},
      create: {
        roleId: roles.admin.id,
        ruleId: rule.id,
      },
    });
  }

  // 为财务角色分配财务相关数据权限
  const financeRules = dataRules.filter(
    (rule) =>
      rule.resource.includes('finance') ||
      rule.resource.includes('order') ||
      rule.resource.includes('refund'),
  );

  for (const rule of financeRules) {
    await prisma.roleDataPermission.upsert({
      where: {
        roleId_ruleId: {
          roleId: roles.finance.id,
          ruleId: rule.id,
        },
      },
      update: {},
      create: {
        roleId: roles.finance.id,
        ruleId: rule.id,
      },
    });
  }

  // 给某个用户特殊的数据权限
  if (users.normalUsers.length > 0 && dataRules.length > 0) {
    await prisma.userDataPermission.upsert({
      where: {
        userId_ruleId: {
          userId: users.normalUsers[0].id,
          ruleId: dataRules[0].id,
        },
      },
      update: {},
      create: {
        userId: users.normalUsers[0].id,
        ruleId: dataRules[0].id,
        granted: true,
      },
    });
  }
}

// 主函数：创建所有关联表数据
export async function createAllRelations(
  prisma: PrismaClient,
  organizationId: string,
  users: CreatedUsers,
  roles: {
    admin: { id: string };
    finance: { id: string };
    customerService: { id: string };
    user: { id: string };
  },
): Promise<void> {
  console.log('Creating user organization relations...');
  await createUserOrganizationRelations(prisma, organizationId, users);

  console.log('Creating role permission relations...');
  await createRolePermissionRelations(prisma, roles);

  console.log('Creating user permission relations...');
  await createUserPermissionRelations(prisma, users);

  console.log('Creating data permission relations...');
  await createDataPermissionRelations(prisma, roles, users);

  console.log('All relations created successfully!');
}
