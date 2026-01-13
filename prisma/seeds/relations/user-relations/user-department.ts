import { PrismaClient, User, Department } from '@prisma/client';

export async function createUserDepartmentRelations(
  prisma: PrismaClient,
  departments: Department[],
  users: User[],
): Promise<void> {
  await prisma.userDepartment.upsert({
    where: {
      userId_departmentId: {
        userId: users[0].id,
        departmentId: departments[0].id,
      },
    },
    update: {},
    create: {
      userId: users[0].id,
      departmentId: departments[0].id,
      isPrimary: true,
    },
  });

  await prisma.userDepartment.upsert({
    where: {
      userId_departmentId: {
        userId: users[1].id,
        departmentId: departments[1].id,
      },
    },
    update: {},
    create: {
      userId: users[1].id,
      departmentId: departments[1].id,
      isPrimary: true,
    },
  });

  await prisma.userDepartment.upsert({
    where: {
      userId_departmentId: {
        userId: users[2].id,
        departmentId: departments[2].id,
      },
    },
    update: {},
    create: {
      userId: users[2].id,
      departmentId: departments[2].id,
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
    await prisma.userDepartment.upsert({
      where: {
        userId_departmentId: {
          userId: assignment.user.id,
          departmentId: assignment.department.id,
        },
      },
      update: {},
      create: {
        userId: assignment.user.id,
        departmentId: assignment.department.id,
        isPrimary: assignment.isPrimary,
      },
    });
  }
}
