/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 00:59:40
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-13 12:01:29
 * @FilePath: /lulab_backend/prisma/seeds/mock/relations/permission-relations/user-permission.ts
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
        prisma.userPermission.upsert({
          where: {
            userId_permissionId: {
              userId: users[0].id,
              permissionId: permissions[0].id,
            },
          },
          update: {},
          create: {
            userId: users[0].id,
            permissionId: permissions[0].id,
            granted: true,
          },
        }),
      );
    }

    if (users.length > 1 && permissions.length > 1) {
      userPermissionOperations.push(
        prisma.userPermission.upsert({
          where: {
            userId_permissionId: {
              userId: users[1].id,
              permissionId: permissions[1].id,
            },
          },
          update: {},
          create: {
            userId: users[1].id,
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
