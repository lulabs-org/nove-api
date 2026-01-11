import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PASSWORDS, type RoleMap } from './config';
import { createUsers, type CreatedUsers } from './users';
import { assignUserRoles } from './roles';

export { type RoleMap } from './config';

export async function createUsersWithRoles(
  prisma: PrismaClient,
  roles: RoleMap,
): Promise<CreatedUsers> {
  try {
    const [adminPasswordHash, userPasswordHash] = await Promise.all([
      bcrypt.hash(PASSWORDS.ADMIN, 10),
      bcrypt.hash(PASSWORDS.USER, 10),
    ]);

    const users = await createUsers(prisma, adminPasswordHash, userPasswordHash);

    await assignUserRoles(
      prisma,
      users.adminUser.id,
      users.financeUser.id,
      users.customerServiceUser.id,
      users.normalUsers,
      roles,
    );

    return users;
  } catch (error) {
    console.error('Failed to create users with roles:', error);
    throw error;
  }
}

export { createUsers, type CreatedUsers } from './users';
export { assignUserRoles, assignRolesToUsers } from './roles';
export * from './config';
