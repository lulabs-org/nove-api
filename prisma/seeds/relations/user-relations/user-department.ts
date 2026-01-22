/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-14 00:30:50
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-22 19:53:49
 * @FilePath: /nove_api/prisma/seeds/relations/user-relations/user-department.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { PrismaClient, User, Dept } from '@prisma/client';

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

export async function createUserDepartmentRelations(
  prisma: PrismaClient,
  departments: Dept[],
  users: User[],
  orgId: string,
): Promise<void> {
  const memberIds = await Promise.all(
    users.map((user) => getOrgMemberId(prisma, user.id)),
  );

  await prisma.memberDepartment.upsert({
    where: {
      memberId_deptId: {
        memberId: memberIds[0],
        deptId: departments[0].id,
      },
    },
    update: {},
    create: {
      memberId: memberIds[0],
      deptId: departments[0].id,
      orgId,
      isPrimary: true,
    },
  });

  await prisma.memberDepartment.upsert({
    where: {
      memberId_deptId: {
        memberId: memberIds[1],
        deptId: departments[1].id,
      },
    },
    update: {},
    create: {
      memberId: memberIds[1],
      deptId: departments[1].id,
      orgId,
      isPrimary: true,
    },
  });

  await prisma.memberDepartment.upsert({
    where: {
      memberId_deptId: {
        memberId: memberIds[2],
        deptId: departments[2].id,
      },
    },
    update: {},
    create: {
      memberId: memberIds[2],
      deptId: departments[2].id,
      orgId,
      isPrimary: true,
    },
  });

  const departmentAssignments = [
    {
      memberId: memberIds[3],
      department: departments[3],
      isPrimary: true,
    },
    {
      memberId: memberIds[4],
      department: departments[4],
      isPrimary: true,
    },
    {
      memberId: memberIds[5],
      department: departments[5],
      isPrimary: true,
    },
    {
      memberId: memberIds[6],
      department: departments[6],
      isPrimary: true,
    },
    { memberId: memberIds[7], department: departments[7], isPrimary: true },
  ];

  for (const assignment of departmentAssignments) {
    await prisma.memberDepartment.upsert({
      where: {
        memberId_deptId: {
          memberId: assignment.memberId,
          deptId: assignment.department.id,
        },
      },
      update: {},
      create: {
        memberId: assignment.memberId,
        deptId: assignment.department.id,
        orgId,
        isPrimary: assignment.isPrimary,
      },
    });
  }
}
