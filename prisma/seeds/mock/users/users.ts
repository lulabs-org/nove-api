import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  COUNTRY_CODE,
  USER_CONFIGS,
  NORMAL_USER_PROFILES,
  PASSWORDS,
} from './config';
import type { UserProfileConfig, CreatedUsers } from './type';

async function createUserWithProfile(
  prisma: PrismaClient,
  email: string,
  phone: string,
  password: string,
  profileData: UserProfileConfig,
): Promise<User> {
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          passwordHash: password,
          emailVerifiedAt: new Date(),
          countryCode: COUNTRY_CODE,
          phone,
          phoneVerifiedAt: new Date(),
        },
      });

      await tx.userProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          ...profileData,
        },
      });

      return user;
    });
  } catch (error) {
    console.error(`Failed to create user with email ${email}:`, error);
    throw error;
  }
}

export async function createUsers(prisma: PrismaClient): Promise<CreatedUsers> {
  try {
    const [adminPasswordHash, userPasswordHash] = await Promise.all([
      bcrypt.hash(PASSWORDS.ADMIN, 10),
      bcrypt.hash(PASSWORDS.USER, 10),
    ]);

    const [adminUser, financeUser, customerServiceUser] = await Promise.all([
      createUserWithProfile(
        prisma,
        USER_CONFIGS.admin.email,
        USER_CONFIGS.admin.phone,
        adminPasswordHash,
        USER_CONFIGS.admin.profile,
      ),
      createUserWithProfile(
        prisma,
        USER_CONFIGS.finance.email,
        USER_CONFIGS.finance.phone,
        adminPasswordHash,
        USER_CONFIGS.finance.profile,
      ),
      createUserWithProfile(
        prisma,
        USER_CONFIGS.customerService.email,
        USER_CONFIGS.customerService.phone,
        adminPasswordHash,
        USER_CONFIGS.customerService.profile,
      ),
    ]);

    const normalUsers = await Promise.all(
      NORMAL_USER_PROFILES.map((profile, index) => {
        const userNumber = index + 1;
        const email = `user${userNumber}@example.com`;
        const phone = `1380013800${userNumber.toString().padStart(2, '0')}`;

        return createUserWithProfile(prisma, email, phone, userPasswordHash, {
          ...profile,
          country: '中国',
          dateOfBirth: new Date(
            1990 + userNumber,
            userNumber % 12,
            ((userNumber * 5) % 28) + 1,
          ),
        });
      }),
    );

    return {
      adminUser,
      financeUser,
      customerServiceUser,
      normalUsers,
    };
  } catch (error) {
    console.error('Failed to create users:', error);
    throw error;
  }
}
