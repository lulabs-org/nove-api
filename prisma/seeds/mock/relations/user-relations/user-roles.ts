import { PrismaClient, User } from '@prisma/client';

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
      assignRolesToUsers(prisma, [adminUserId], roles.admin.id),
      assignRolesToUsers(prisma, [financeUserId], roles.finance.id),
      assignRolesToUsers(
        prisma,
        [customerServiceUserId],
        roles.customerService.id,
      ),
      assignRolesToUsers(
        prisma,
        normalUsers.map((u) => u.id),
        roles.user.id,
      ),
    ]);
  } catch (error) {
    console.error('Failed to assign user roles:', error);
    throw error;
  }
}
