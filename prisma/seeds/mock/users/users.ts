/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 12:44:09
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-13 14:47:53
 * @FilePath: /lulab_backend/prisma/seeds/mock/users/users.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { COUNTRY_CODE, USERS_MOCK, USERS_REAL } from './config';
import { UserConfig, UserProfileCreateInput } from './type';



async function createUserWithProfile(
  prisma: PrismaClient,
  email: string,
  phone: string,
  password: string,
  profileData: UserProfileCreateInput,
): Promise<User> {
  console.log(`开始创建用户: ${email}, ${phone}`);

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: {
        uq_users_country_code_phone: {
          countryCode: COUNTRY_CODE,
          phone,
        },
      },
      update: {
        email,
        passwordHash: password,
        emailVerifiedAt: new Date(),
        countryCode: COUNTRY_CODE,
        phone,
        phoneVerifiedAt: new Date(),
      },
      create: {
        email,
        passwordHash: password,
        emailVerifiedAt: new Date(),
        countryCode: COUNTRY_CODE,
        phone,
        phoneVerifiedAt: new Date(),
      },
    });

    console.log(
      `用户 ${user.id} (${email}) 已${user.createdAt ? '创建' : '更新'}`,
    );

    await tx.userProfile.upsert({
      where: { userId: user.id },
      update: {
        ...profileData,
      },
      create: {
        userId: user.id,
        ...profileData,
      },
    });

    console.log(`用户 ${user.id} 的资料已${user.createdAt ? '创建' : '更新'}`);

    return user;
  });
}

export async function createUsers(
  prisma: PrismaClient,
  useRealData = false,
): Promise<User[]> {
  const dataSource = useRealData ? '真实数据' : '模拟数据';
  console.log(`开始创建用户，使用${dataSource}`);

  const passwordCache = new Map<string, string>();
  const usersData = useRealData ? USERS_REAL : USERS_MOCK;

  console.log(`准备创建 ${usersData.length} 个用户`);

  const users = await Promise.all(
    usersData.map(async (userConfig: UserConfig) => {
      const { email, phone, password, profile } = userConfig;

      const passwordHash =
        passwordCache.get(password) || (await bcrypt.hash(password, 10));
      passwordCache.set(password, passwordHash);

      return createUserWithProfile(prisma, email, phone, passwordHash, profile);
    }),
  );

  console.log(`成功创建 ${users.length} 个用户`);

  return users;
}
