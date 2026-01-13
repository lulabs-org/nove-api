import { PrismaClient } from '@prisma/client';
import { PLATFORM_USER_CONFIGS } from './config';

export async function createPlatformUsers(prisma: PrismaClient) {
  console.log('👤 开始创建平台用户数据...');

  try {
    const platformUsers = await Promise.all(
      Object.entries(PLATFORM_USER_CONFIGS).map(async ([key, config]) => {
        const platformUser = await prisma.platformUser.upsert({
          where: {
            unique_platform_union_user: {
              platform: config.platform,
              ptUnionId: config.ptUnionId || '',
            },
          },
          update: config,
          create: config,
        });

        console.log(`✅ 创建/更新平台用户: ${platformUser.displayName}`);
        return { key, platformUser };
      }),
    );

    console.log(`👥 平台用户数据创建完成，共 ${platformUsers.length} 个用户`);
    return { platformUsers };
  } catch (error) {
    console.error('❌ 创建平台用户数据失败:', error);
    throw error;
  }
}
