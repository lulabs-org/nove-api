/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 00:58:43
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 10:29:55
 * @FilePath: /nove_api/prisma/seeds/mock/relations/user-relations/user-organization.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { PrismaClient } from '@prisma/client';
import type { CreatedUsers } from '../../users';

export async function createUserOrganizationRelations(
  prisma: PrismaClient,
  organizationId: string,
  users: CreatedUsers,
): Promise<void> {
  try {
    const allUsers = [
      users.adminUser,
      users.financeUser,
      users.customerServiceUser,
      ...users.normalUsers,
    ];

    await Promise.all(
      allUsers.map((user) =>
        prisma.userOrganization.upsert({
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
        }),
      ),
    );
  } catch (error) {
    console.error('Failed to create user organization relations:', error);
    throw error;
  }
}
