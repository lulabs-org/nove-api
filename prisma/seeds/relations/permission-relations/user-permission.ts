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

async function getOrgMemberId(
  prisma: PrismaClient,
  userId: string,
): Promise<string> {
  const orgMember = await prisma.orgMember.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (!orgMember) {
    throw new Error(`OrgMember not found for user ID: ${userId}`);
  }

  return orgMember.id;
}

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
      const memberIds = await Promise.all(
        users.slice(0, 2).map((user) => getOrgMemberId(prisma, user.id)),
      );

      userPermissionOperations.push(
        prisma.memberPermission.upsert({
          where: {
            memberId_permissionId: {
              memberId: memberIds[0],
              permissionId: permissions[0].id,
            },
          },
          update: {},
          create: {
            memberId: memberIds[0],
            permissionId: permissions[0].id,
            granted: true,
          },
        }),
      );
    }

    if (users.length > 1 && permissions.length > 1) {
      const memberIds = await Promise.all(
        users.slice(0, 2).map((user) => getOrgMemberId(prisma, user.id)),
      );

      userPermissionOperations.push(
        prisma.memberPermission.upsert({
          where: {
            memberId_permissionId: {
              memberId: memberIds[1],
              permissionId: permissions[1].id,
            },
          },
          update: {},
          create: {
            memberId: memberIds[1],
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
