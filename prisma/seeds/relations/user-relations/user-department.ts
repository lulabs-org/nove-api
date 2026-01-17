/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-14 00:30:50
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-17 17:19:06
 * @FilePath: /nove_api/prisma/seeds/relations/user-relations/user-department.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */

import { PrismaClient, User, Dept } from '@prisma/client';

export async function createUserDepartmentRelations(
  prisma: PrismaClient,
  departments: Dept[],
  users: User[],
): Promise<void> {
  await prisma.memberDepartment.upsert({
    where: {
      memberId_deptId: {
        memberId: users[0].id,
        deptId: departments[0].id,
      },
    },
    update: {},
    create: {
      memberId: users[0].id,
      deptId: departments[0].id,
      isPrimary: true,
    },
  });

  await prisma.memberDepartment.upsert({
    where: {
      memberId_deptId: {
        memberId: users[1].id,
        deptId: departments[1].id,
      },
    },
    update: {},
    create: {
      memberId: users[1].id,
      deptId: departments[1].id,
      isPrimary: true,
    },
  });

  await prisma.memberDepartment.upsert({
    where: {
      memberId_deptId: {
        memberId: users[2].id,
        deptId: departments[2].id,
      },
    },
    update: {},
    create: {
      memberId: users[2].id,
      deptId: departments[2].id,
      isPrimary: true,
    },
  });

  const departmentAssignments = [
    {
      user: users[3],
      department: departments[3],
      isPrimary: true,
    },
    {
      user: users[4],
      department: departments[4],
      isPrimary: true,
    },
    {
      user: users[5],
      department: departments[5],
      isPrimary: true,
    },
    {
      user: users[6],
      department: departments[6],
      isPrimary: true,
    },
    { user: users[7], department: departments[7], isPrimary: true },
  ];

  for (const assignment of departmentAssignments) {
    await prisma.memberDepartment.upsert({
      where: {
        memberId_deptId: {
          memberId: assignment.user.id,
          deptId: assignment.department.id,
        },
      },
      update: {},
      create: {
        memberId: assignment.user.id,
        deptId: assignment.department.id,
        isPrimary: assignment.isPrimary,
      },
    });
  }
}
