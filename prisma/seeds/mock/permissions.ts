/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-06-19 21:41:26
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-15 20:20:26
 * @FilePath: /lulab_backend/prisma/seeds/permissions.ts
 * @Description: 权限和角色权限分配种子模块
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { PrismaClient, $Enums, Permission, Role } from '@prisma/client';

export interface CreatedPermissions {
  permissions: Permission[];
  roles: {
    superAdmin: Role;
    admin: Role;
    manager: Role;
    finance: Role;
    customerService: Role;
    user: Role;
  };
}

export async function createPermissions(
  prisma: PrismaClient,
): Promise<CreatedPermissions> {
  // 定义基础权限
  const basePermissions = [
    // 用户管理
    {
      name: '查看用户',
      code: 'user:read',
      description: '查看用户信息',
      resource: 'user',
      action: 'read',
    },
    {
      name: '创建用户',
      code: 'user:create',
      description: '创建新用户',
      resource: 'user',
      action: 'create',
    },
    {
      name: '编辑用户',
      code: 'user:update',
      description: '编辑用户信息',
      resource: 'user',
      action: 'update',
    },
    {
      name: '删除用户',
      code: 'user:delete',
      description: '删除用户',
      resource: 'user',
      action: 'delete',
    },
    {
      name: '重置用户密码',
      code: 'user:reset-password',
      description: '重置用户密码',
      resource: 'user',
      action: 'reset-password',
    },

    // 角色管理
    {
      name: '查看角色',
      code: 'role:read',
      description: '查看角色信息',
      resource: 'role',
      action: 'read',
    },
    {
      name: '创建角色',
      code: 'role:create',
      description: '创建新角色',
      resource: 'role',
      action: 'create',
    },
    {
      name: '编辑角色',
      code: 'role:update',
      description: '编辑角色信息',
      resource: 'role',
      action: 'update',
    },
    {
      name: '删除角色',
      code: 'role:delete',
      description: '删除角色',
      resource: 'role',
      action: 'delete',
    },
    {
      name: '分配角色权限',
      code: 'role:assign-permission',
      description: '为角色分配权限',
      resource: 'role',
      action: 'assign-permission',
    },

    // 权限管理
    {
      name: '查看权限',
      code: 'permission:read',
      description: '查看权限信息',
      resource: 'permission',
      action: 'read',
    },
    {
      name: '创建权限',
      code: 'permission:create',
      description: '创建新权限',
      resource: 'permission',
      action: 'create',
    },
    {
      name: '编辑权限',
      code: 'permission:update',
      description: '编辑权限信息',
      resource: 'permission',
      action: 'update',
    },
    {
      name: '删除权限',
      code: 'permission:delete',
      description: '删除权限',
      resource: 'permission',
      action: 'delete',
    },

    // 组织管理
    {
      name: '查看组织',
      code: 'organization:read',
      description: '查看组织信息',
      resource: 'organization',
      action: 'read',
    },
    {
      name: '创建组织',
      code: 'organization:create',
      description: '创建新组织',
      resource: 'organization',
      action: 'create',
    },
    {
      name: '编辑组织',
      code: 'organization:update',
      description: '编辑组织信息',
      resource: 'organization',
      action: 'update',
    },
    {
      name: '删除组织',
      code: 'organization:delete',
      description: '删除组织',
      resource: 'organization',
      action: 'delete',
    },

    // 部门管理
    {
      name: '查看部门',
      code: 'department:read',
      description: '查看部门信息',
      resource: 'department',
      action: 'read',
    },
    {
      name: '创建部门',
      code: 'department:create',
      description: '创建新部门',
      resource: 'department',
      action: 'create',
    },
    {
      name: '编辑部门',
      code: 'department:update',
      description: '编辑部门信息',
      resource: 'department',
      action: 'update',
    },
    {
      name: '删除部门',
      code: 'department:delete',
      description: '删除部门',
      resource: 'department',
      action: 'delete',
    },

    // 产品管理
    {
      name: '查看产品',
      code: 'product:read',
      description: '查看产品信息',
      resource: 'product',
      action: 'read',
    },
    {
      name: '创建产品',
      code: 'product:create',
      description: '创建新产品',
      resource: 'product',
      action: 'create',
    },
    {
      name: '编辑产品',
      code: 'product:update',
      description: '编辑产品信息',
      resource: 'product',
      action: 'update',
    },
    {
      name: '删除产品',
      code: 'product:delete',
      description: '删除产品',
      resource: 'product',
      action: 'delete',
    },
    {
      name: '产品上下架',
      code: 'product:toggle-status',
      description: '产品上下架操作',
      resource: 'product',
      action: 'toggle-status',
    },

    // 订单管理
    {
      name: '查看订单',
      code: 'order:read',
      description: '查看订单信息',
      resource: 'order',
      action: 'read',
    },
    {
      name: '创建订单',
      code: 'order:create',
      description: '创建新订单',
      resource: 'order',
      action: 'create',
    },
    {
      name: '编辑订单',
      code: 'order:update',
      description: '编辑订单信息',
      resource: 'order',
      action: 'update',
    },
    {
      name: '删除订单',
      code: 'order:delete',
      description: '删除订单',
      resource: 'order',
      action: 'delete',
    },
    {
      name: '订单状态管理',
      code: 'order:status',
      description: '管理订单状态',
      resource: 'order',
      action: 'status',
    },

    // 财务管理
    {
      name: '查看财务报表',
      code: 'finance:read',
      description: '查看财务报表',
      resource: 'finance',
      action: 'read',
    },
    {
      name: '导出财务数据',
      code: 'finance:export',
      description: '导出财务数据',
      resource: 'finance',
      action: 'export',
    },
    {
      name: '财务审核',
      code: 'finance:audit',
      description: '财务审核权限',
      resource: 'finance',
      action: 'audit',
    },

    // 系统管理
    {
      name: '系统配置',
      code: 'system:config',
      description: '系统配置管理',
      resource: 'system',
      action: 'config',
    },
    {
      name: '系统监控',
      code: 'system:monitor',
      description: '系统监控',
      resource: 'system',
      action: 'monitor',
    },
    {
      name: '系统日志',
      code: 'system:log',
      description: '查看系统日志',
      resource: 'system',
      action: 'log',
    },

    // 仪表板
    {
      name: '查看仪表板',
      code: 'dashboard:read',
      description: '查看仪表板',
      resource: 'dashboard',
      action: 'read',
    },
    {
      name: '管理仪表板',
      code: 'dashboard:manage',
      description: '管理仪表板配置',
      resource: 'dashboard',
      action: 'manage',
    },
  ];

  // 创建权限
  const permissions: Permission[] = [];
  for (const permissionData of basePermissions) {
    const permission = await prisma.permission.upsert({
      where: { code: permissionData.code },
      update: {},
      create: permissionData,
    });
    permissions.push(permission);
  }

  // 创建完整的角色体系

  const roles = {
    superAdmin: await prisma.role.upsert({
      where: { code: 'SUPER_ADMIN' },
      update: {},
      create: {
        name: '超级管理员',
        code: 'SUPER_ADMIN',
        description: '超级管理员，拥有所有权限',
        level: 0,
        type: $Enums.RoleType.SYSTEM,
      },
    }),
    admin: await prisma.role.upsert({
      where: { code: 'ADMIN' },
      update: {},
      create: {
        name: '管理员',
        code: 'ADMIN',
        description: '系统管理员，拥有大部分管理权限',
        level: 1,
        type: $Enums.RoleType.SYSTEM,
      },
    }),
    manager: await prisma.role.upsert({
      where: { code: 'MANAGER' },
      update: {},
      create: {
        name: '经理',
        code: 'MANAGER',
        description: '部门经理，拥有部门管理权限',
        level: 2,
        type: $Enums.RoleType.CUSTOM,
      },
    }),
    finance: await prisma.role.upsert({
      where: { code: 'FINANCE' },
      update: {},
      create: {
        name: '财务',
        code: 'FINANCE',
        description: '财务人员，拥有财务相关权限',
        level: 3,
        type: $Enums.RoleType.CUSTOM,
      },
    }),
    customerService: await prisma.role.upsert({
      where: { code: 'CUSTOMER_SERVICE' },
      update: {},
      create: {
        name: '客服',
        code: 'CUSTOMER_SERVICE',
        description: '客服人员，拥有客户服务权限',
        level: 4,
        type: $Enums.RoleType.CUSTOM,
      },
    }),
    user: await prisma.role.upsert({
      where: { code: 'USER' },
      update: {},
      create: {
        name: '普通用户',
        code: 'USER',
        description: '普通用户，基础查看权限',
        level: 5,
        type: $Enums.RoleType.CUSTOM,
      },
    }),
  };

  // 为角色分配权限

  // 超级管理员拥有所有权限
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

  // 管理员权限（除了系统配置）
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

  // 经理权限
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

  // 财务权限
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

  // 客服权限
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

  // 普通用户权限
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

  return {
    permissions,
    roles,
  };
}
