/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 12:44:09
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-13 12:17:43
 * @FilePath: /lulab_backend/prisma/seeds/mock/relations/user-relations/user-roles.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { PrismaClient, User, Role } from '@prisma/client';

export async function assignRolesToUsers(
  prisma: PrismaClient,
  userIds: string[],
  roleId: string,
): Promise<void> {
  try {
    await prisma.userRole.createMany({
      data: userIds.map((userId) => ({
        userId,
        roleId,
      })),
      skipDuplicates: true,
    });
  } catch (error) {
    console.error(
      `Failed to assign role ${roleId} to ${userIds.length} users:`,
      error,
    );
    throw error;
  }
}

export async function assignUserRoles(
  prisma: PrismaClient,
  userData: User[],
  roleIds: Role[],
): Promise<void> {
  try {
    await Promise.all([
      assignRolesToUsers(prisma, [userData[0].id], roleIds[0].id),
      assignRolesToUsers(prisma, [userData[1].id], roleIds[1].id),
      assignRolesToUsers(prisma, [userData[2].id], roleIds[2].id),
      assignRolesToUsers(
        prisma,
        userData.slice(3).map((u) => u.id),
        roleIds[3].id,
      ),
    ]);
  } catch (error) {
    console.error('Failed to assign user roles:', error);
    throw error;
  }
}
