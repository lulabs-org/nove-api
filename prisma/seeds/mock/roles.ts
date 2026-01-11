/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 01:46:42
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 01:49:37
 * @FilePath: /nove_api/prisma/seeds/mock/roles.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */
import { PrismaClient, Role, $Enums } from '@prisma/client';

interface RoleConfig {
  key: keyof CreatedRoles;
  code: string;
  name: string;
  description: string;
  level: number;
  type: $Enums.RoleType;
}

const ROLE_CONFIGS: RoleConfig[] = [
  {
    key: 'superAdmin',
    code: 'SUPER_ADMIN',
    name: '超级管理员',
    description: '超级管理员，拥有所有权限',
    level: 0,
    type: $Enums.RoleType.SYSTEM,
  },
  {
    key: 'admin',
    code: 'ADMIN',
    name: '管理员',
    description: '系统管理员，拥有大部分管理权限',
    level: 1,
    type: $Enums.RoleType.SYSTEM,
  },
  {
    key: 'manager',
    code: 'MANAGER',
    name: '经理',
    description: '部门经理，拥有部门管理权限',
    level: 2,
    type: $Enums.RoleType.CUSTOM,
  },
  {
    key: 'finance',
    code: 'FINANCE',
    name: '财务',
    description: '财务人员，拥有财务相关权限',
    level: 3,
    type: $Enums.RoleType.CUSTOM,
  },
  {
    key: 'customerService',
    code: 'CUSTOMER_SERVICE',
    name: '客服',
    description: '客服人员，拥有客户服务权限',
    level: 4,
    type: $Enums.RoleType.CUSTOM,
  },
  {
    key: 'user',
    code: 'USER',
    name: '普通用户',
    description: '普通用户，基础查看权限',
    level: 5,
    type: $Enums.RoleType.CUSTOM,
  },
];

export interface CreatedRoles {
  superAdmin: Role;
  admin: Role;
  manager: Role;
  finance: Role;
  customerService: Role;
  user: Role;
}

async function upsertRole(prisma: PrismaClient, config: RoleConfig): Promise<Role> {
  return prisma.role.upsert({
    where: { code: config.code },
    update: {},
    create: {
      name: config.name,
      code: config.code,
      description: config.description,
      level: config.level,
      type: config.type,
    },
  });
}

export async function createRoles(prisma: PrismaClient): Promise<CreatedRoles> {
  const rolePromises = ROLE_CONFIGS.map(config => upsertRole(prisma, config));
  const roles = await Promise.all(rolePromises);

  return ROLE_CONFIGS.reduce((acc, config, index) => {
    acc[config.key] = roles[index];
    return acc;
  }, {} as CreatedRoles);
}
