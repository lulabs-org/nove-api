/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 00:58:43
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-13 11:41:51
 * @FilePath: /lulab_backend/prisma/seeds/mock/relations/user-relations/user-organization.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { PrismaClient } from '@prisma/client';
import { User } from '@prisma/client';

export async function createUserOrganizationRelations(
  prisma: PrismaClient,
  organizationId: string,
  users: User[],
): Promise<void> {
  try {
    await Promise.all(
      users.map((user) =>
        prisma.orgMember.upsert({
          where: {
            orgId_userId: {
              orgId: organizationId,
              userId: user.id,
            },
          },
          update: {},
          create: {
            userId: user.id,
            orgId: organizationId,
          },
        }),
      ),
    );
  } catch (error) {
    console.error('Failed to create user organization relations:', error);
    throw error;
  }
}
