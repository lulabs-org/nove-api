import { PrismaClient, User } from '@prisma/client';

async function assignUserRole(
  prisma: PrismaClient,
  userId: string,
  roleId: string,
): Promise<void> {
  try {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      update: {},
      create: {
        userId,
        roleId,
      },
    });
  } catch (error) {
    console.error(`Failed to assign role ${roleId} to user ${userId}:`, error);
    throw error;
  }
}

export async function assignRolesToUsers(
  prisma: PrismaClient,
  users: User[],
  roleId: string,
): Promise<void> {
  try {
    await prisma.userRole.createMany({
      data: users.map((user) => ({
        userId: user.id,
        roleId,
      })),
      skipDuplicates: true,
    });
  } catch (error) {
    console.error(`Failed to assign role ${roleId} to ${users.length} users:`, error);
    throw error;
  }
}

export async function assignUserRoles(
  prisma: PrismaClient,
  adminUserId: string,
  financeUserId: string,
  customerServiceUserId: string,
  normalUsers: User[],
  roles: {
    admin: { id: string };
    finance: { id: string };
    customerService: { id: string };
    user: { id: string };
  },
): Promise<void> {
  try {
    await Promise.all([
      assignUserRole(prisma, adminUserId, roles.admin.id),
      assignUserRole(prisma, financeUserId, roles.finance.id),
      assignUserRole(prisma, customerServiceUserId, roles.customerService.id),
      assignRolesToUsers(prisma, normalUsers, roles.user.id),
    ]);
  } catch (error) {
    console.error('Failed to assign user roles:', error);
    throw error;
  }
}
