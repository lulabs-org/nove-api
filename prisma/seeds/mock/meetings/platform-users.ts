import { PrismaClient, Platform, Prisma } from '@prisma/client';

type PlatformUserConfig = Omit<
  Prisma.PlatformUserUncheckedCreateInput,
  'id' | 'createdAt' | 'updatedAt' | 'platform'
> & {
  platform: Platform;
};

const PLATFORM_USER_CONFIGS: Record<string, PlatformUserConfig> = {
  host1: {
    platform: Platform.TENCENT_MEETING,
    ptUserId: 'user_12345',
    displayName: '张三',
    email: 'zhangsan@company.com',
    active: true,
  },
  host2: {
    platform: Platform.ZOOM,
    ptUserId: 'user_67890',
    displayName: '李四',
    email: 'lisi@company.com',
    active: true,
  },
  host3: {
    platform: Platform.TENCENT_MEETING,
    ptUserId: 'user_54321',
    displayName: '王五',
    email: 'wangwu@company.com',
    active: true,
  },
  host4: {
    platform: Platform.DINGTALK,
    ptUserId: 'user_98765',
    displayName: '赵六',
    email: 'zhaoliu@company.com',
    active: true,
  },
  participant1: {
    platform: Platform.TENCENT_MEETING,
    ptUserId: 'participant_001',
    displayName: '参与者1',
    email: 'participant1@company.com',
    active: true,
  },
  participant2: {
    platform: Platform.TENCENT_MEETING,
    ptUserId: 'participant_002',
    displayName: '参与者2',
    email: 'participant2@company.com',
    active: true,
  },
};

export interface CreatedPlatformUsers {
  host1: Prisma.PlatformUserGetPayload<Record<string, never>>;
  host2: Prisma.PlatformUserGetPayload<Record<string, never>>;
  host3: Prisma.PlatformUserGetPayload<Record<string, never>>;
  host4: Prisma.PlatformUserGetPayload<Record<string, never>>;
  participant1: Prisma.PlatformUserGetPayload<Record<string, never>>;
  participant2: Prisma.PlatformUserGetPayload<Record<string, never>>;
}

export async function createPlatformUsers(
  prisma: PrismaClient,
): Promise<CreatedPlatformUsers> {
  const platformUsersRaw = await Promise.all(
    Object.entries(PLATFORM_USER_CONFIGS).map(async ([key, config]) => {
      const existingUser = await prisma.platformUser.findFirst({
        where: {
          platform: config.platform,
          ptUserId: config.ptUserId,
        },
      });

      let user: Prisma.PlatformUserGetPayload<Record<string, never>>;
      if (existingUser) {
        user = await prisma.platformUser.update({
          where: { id: existingUser.id },
          data: {
            displayName: config.displayName,
            email: config.email,
            active: config.active,
            lastSeenAt: new Date(),
          },
        });
      } else {
        user = await prisma.platformUser.create({
          data: {
            platform: config.platform,
            ptUserId: config.ptUserId,
            displayName: config.displayName,
            email: config.email,
            active: config.active,
            lastSeenAt: new Date(),
          },
        });
      }
      return { key, user };
    }),
  );

  const platformUsers = platformUsersRaw.reduce(
    (acc, { key, user }) => {
      acc[key] = user;
      return acc;
    },
    {} as Record<string, Prisma.PlatformUserGetPayload<Record<string, never>>>,
  );

  return platformUsers as unknown as CreatedPlatformUsers;
}
