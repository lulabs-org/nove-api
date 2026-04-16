import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { PlatformUser, Platform, Prisma } from '@prisma/client';

type PlatformUserCreateInput = Prisma.PlatformUserUncheckedCreateInput;
type PlatformUserUpdateInput = Prisma.PlatformUserUncheckedUpdateInput;

type PlatformUserWithProfile = Prisma.PlatformUserGetPayload<{
  include: {
    user: {
      include: {
        profile: true;
      };
    };
  };
}>;

@Injectable()
export class PlatformUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Omit<
      PlatformUserCreateInput,
      'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
    >,
  ): Promise<PlatformUser> {
    return this.prisma.platformUser.create({
      data: {
        ...data,
        active: data.active ?? true,
      },
    });
  }

  async update(
    id: string,
    data: Partial<
      Omit<
        PlatformUserUpdateInput,
        'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
      >
    >,
  ): Promise<PlatformUser> {
    return this.prisma.platformUser.update({
      where: { id, deletedAt: null },
      data,
    });
  }

  async upsert(
    where: { platform: Platform; ptUnionId: string },
    data: Omit<
      PlatformUserCreateInput,
      'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'platform' | 'ptUnionId'
    >,
  ): Promise<PlatformUser> {
    const now = new Date();
    const { platform, ptUnionId } = where;
    return this.prisma.platformUser.upsert({
      where: { unique_platform_union_user: { platform, ptUnionId } },
      create: { ...data, platform, ptUnionId, lastSeenAt: now },
      update: { ...data, lastSeenAt: now, deletedAt: null },
    });
  }

  async upsertMany(
    items: Array<{
      where: { platform: Platform; ptUnionId: string };
      data: Omit<
        PlatformUserCreateInput,
        | 'id'
        | 'createdAt'
        | 'updatedAt'
        | 'deletedAt'
        | 'platform'
        | 'ptUnionId'
      >;
    }>,
  ): Promise<PlatformUser[]> {
    const now = new Date();

    return this.prisma.$transaction(
      items.map(({ where, data }) => {
        const { platform, ptUnionId } = where;
        return this.prisma.platformUser.upsert({
          where: { unique_platform_union_user: { platform, ptUnionId } },
          create: { ...data, platform, ptUnionId, lastSeenAt: now },
          update: { ...data, lastSeenAt: now, deletedAt: null },
        });
      }),
    );
  }

  async findByUnionId(
    platform: Platform,
    ptUnionId: string,
  ): Promise<PlatformUser | null> {
    return this.prisma.platformUser.findFirst({
      where: {
        platform,
        ptUnionId,
        deletedAt: null,
      },
    });
  }

  async findById(id: string): Promise<PlatformUserWithProfile | null> {
    return this.prisma.platformUser.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: string): Promise<PlatformUser[]> {
    return this.prisma.platformUser.findMany({
      where: {
        user: { id: userId },
        deletedAt: null,
      },
    });
  }

  async findActiveByPlatform(platform: Platform): Promise<PlatformUser[]> {
    return this.prisma.platformUser.findMany({
      where: {
        platform,
        active: true,
        deletedAt: null,
      },
    });
  }

  async findByPtUserId(
    platform: Platform,
    ptUserId: string,
  ): Promise<PlatformUser | null> {
    return this.prisma.platformUser.findFirst({
      where: {
        platform,
        ptUserId,
        active: true,
        deletedAt: null,
      },
    });
  }

  async findByPtName(
    platform: Platform,
    displayName: string,
  ): Promise<PlatformUser | null> {
    return this.prisma.platformUser.findFirst({
      where: {
        platform,
        displayName,
        active: true,
        deletedAt: null,
      },
    });
  }

  async findByPhoneHashWithoutLocalUser(
    platform: Platform,
    countryCode: string,
    phoneHash: string,
  ): Promise<PlatformUser | null> {
    return this.prisma.platformUser.findFirst({
      where: {
        platform,
        countryCode,
        phoneHash,
        localUserId: null,
        active: true,
        deletedAt: null,
      },
    });
  }

  async findByPhoneHash(
    platform: Platform,
    countryCode: string,
    phoneHash: string,
  ): Promise<PlatformUser | null> {
    return this.prisma.platformUser.findFirst({
      where: {
        platform,
        countryCode,
        phoneHash,
        active: true,
        deletedAt: null,
      },
    });
  }

  async updateLastSeen(id: string): Promise<PlatformUser> {
    return this.prisma.platformUser.update({
      where: { id, deletedAt: null },
      data: { lastSeenAt: new Date() },
    });
  }

  async deactivate(id: string): Promise<PlatformUser> {
    return this.prisma.platformUser.update({
      where: { id, deletedAt: null },
      data: { active: false },
    });
  }

  async activate(id: string): Promise<PlatformUser> {
    return this.prisma.platformUser.update({
      where: { id, deletedAt: null },
      data: { active: true },
    });
  }

  async deleteByPhone(
    countryCode: string,
    phone: string,
  ): Promise<{ count: number }> {
    return this.prisma.platformUser.updateMany({
      where: {
        countryCode,
        phone,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async deleteById(id: string): Promise<PlatformUser> {
    return this.prisma.platformUser.update({
      where: { id, deletedAt: null },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
