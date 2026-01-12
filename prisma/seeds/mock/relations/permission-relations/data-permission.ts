/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 01:00:05
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 01:00:07
 * @FilePath: /nove_api/prisma/seeds/mock/relations/data-permission.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { PrismaClient } from '@prisma/client';
import type { CreatedUsers } from '../../users';
import type { RoleDataPermissionMap } from '../config';

export async function createDataPermissionRelations(
  prisma: PrismaClient,
  roles: RoleDataPermissionMap,
  users: CreatedUsers,
): Promise<void> {
  try {
    const dataRules = await prisma.dataPermissionRule.findMany();

    if (dataRules.length === 0) {
      console.log(
        'No data permission rules found, skipping data permission relations',
      );
      return;
    }

    const adminDataPermissions = dataRules.map((rule) =>
      prisma.roleDataPermission.upsert({
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
      }),
    );

    const financeRules = dataRules.filter(
      (rule) =>
        rule.resource.includes('finance') ||
        rule.resource.includes('order') ||
        rule.resource.includes('refund'),
    );

    const financeDataPermissions = financeRules.map((rule) =>
      prisma.roleDataPermission.upsert({
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
      }),
    );

    const userDataPermissions: Promise<any>[] = [];

    if (users.normalUsers.length > 0 && dataRules.length > 0) {
      userDataPermissions.push(
        prisma.userDataPermission.upsert({
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
        }),
      );
    }

    await Promise.all([
      ...adminDataPermissions,
      ...financeDataPermissions,
      ...userDataPermissions,
    ]);
  } catch (error) {
    console.error('Failed to create data permission relations:', error);
    throw error;
  }
}
