/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 00:59:40
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-17 16:40:05
 * @FilePath: /nove_api/prisma/seeds/relations/permission-relations/user-permission.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { PrismaClient, User } from '@prisma/client';

export async function createUserPermissionRelations(
  prisma: PrismaClient,
  users: User[],
): Promise<void> {
  try {
    const permissions = await prisma.permission.findMany({
      take: 3,
    });

    if (permissions.length === 0) {
      console.log('No permissions found, skipping user permission relations');
      return;
    }

    const userPermissionOperations: Promise<any>[] = [];

    if (users.length > 0) {
      userPermissionOperations.push(
        prisma.memberPermission.upsert({
          where: {
            memberId_permissionId: {
              memberId: users[0].id,
              permissionId: permissions[0].id,
            },
          },
          update: {},
          create: {
            memberId: users[0].id,
            permissionId: permissions[0].id,
            granted: true,
          },
        }),
      );
    }

    if (users.length > 1 && permissions.length > 1) {
      userPermissionOperations.push(
        prisma.memberPermission.upsert({
          where: {
            memberId_permissionId: {
              memberId: users[1].id,
              permissionId: permissions[1].id,
            },
          },
          update: {},
          create: {
            memberId: users[1].id,
            permissionId: permissions[1].id,
            granted: false,
          },
        }),
      );
    }

    await Promise.all(userPermissionOperations);
  } catch (error) {
    console.error('Failed to create user permission relations:', error);
    throw error;
  }
}
