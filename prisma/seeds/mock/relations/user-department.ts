import { PrismaClient } from '@prisma/client';
import { CreatedDepartments } from '../departments/config';
import { CreatedUsers } from '../users';

export async function createUserDepartmentRelations(
  prisma: PrismaClient,
  departments: CreatedDepartments,
  users: CreatedUsers,
): Promise<void> {
  await prisma.userDepartment.upsert({
    where: {
      userId_departmentId: {
        userId: users.adminUser.id,
        departmentId: departments.tech.id,
      },
    },
    update: {},
    create: {
      userId: users.adminUser.id,
      departmentId: departments.tech.id,
      isPrimary: true,
    },
  });

  await prisma.userDepartment.upsert({
    where: {
      userId_departmentId: {
        userId: users.financeUser.id,
        departmentId: departments.finance.id,
      },
    },
    update: {},
    create: {
      userId: users.financeUser.id,
      departmentId: departments.finance.id,
      isPrimary: true,
    },
  });

  await prisma.userDepartment.upsert({
    where: {
      userId_departmentId: {
        userId: users.customerServiceUser.id,
        departmentId: departments.customerService.id,
      },
    },
    update: {},
    create: {
      userId: users.customerServiceUser.id,
      departmentId: departments.customerService.id,
      isPrimary: true,
    },
  });

  const departmentAssignments = [
    {
      user: users.normalUsers[0],
      department: departments.techDev,
      isPrimary: true,
    },
    {
      user: users.normalUsers[1],
      department: departments.salesDirect,
      isPrimary: true,
    },
    {
      user: users.normalUsers[2],
      department: departments.techOps,
      isPrimary: true,
    },
    {
      user: users.normalUsers[3],
      department: departments.salesChannel,
      isPrimary: true,
    },
    { user: users.normalUsers[4], department: departments.hr, isPrimary: true },
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

  await prisma.userDepartment.upsert({
    where: {
      userId_departmentId: {
        userId: users.normalUsers[0].id,
        departmentId: departments.tech.id,
      },
    },
    update: {},
    create: {
      userId: users.normalUsers[0].id,
      departmentId: departments.tech.id,
      isPrimary: false,
    },
  });

  await prisma.userDepartment.upsert({
    where: {
      userId_departmentId: {
        userId: users.normalUsers[1].id,
        departmentId: departments.sales.id,
      },
    },
    update: {},
    create: {
      userId: users.normalUsers[1].id,
      departmentId: departments.sales.id,
      isPrimary: false,
    },
  });
}
