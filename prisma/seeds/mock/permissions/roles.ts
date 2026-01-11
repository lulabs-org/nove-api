import { PrismaClient, Role, $Enums } from '@prisma/client';

export interface CreatedRoles {
  superAdmin: Role;
  admin: Role;
  manager: Role;
  finance: Role;
  customerService: Role;
  user: Role;
}

export async function createRoles(prisma: PrismaClient): Promise<CreatedRoles> {
  const roles = {
    // 超级管理员：拥有所有权限，系统最高级别角色
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
    // 管理员：拥有大部分管理权限，仅次于超级管理员
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
    // 经理：拥有部门管理权限，负责部门日常管理
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
    // 财务：拥有财务相关权限，负责财务报表和审核
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
    // 客服：拥有客户服务权限，负责订单和用户服务
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
    // 普通用户：基础查看权限，只能查看基本信息
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

  return roles;
}
