import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { PlatformUser, Platform, Prisma } from '@prisma/client';

type PlatformUserCreateInput = Prisma.PlatformUserUncheckedCreateInput;
type PlatformUserUpdateInput = Prisma.PlatformUserUncheckedUpdateInput;

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
      where: { id },
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
      update: { ...data, lastSeenAt: now },
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
          update: { ...data, lastSeenAt: now },
        });
      }),
    );
  }

  async findByPlatformAndUnionId(
    platform: Platform,
    ptUnionId: string,
  ): Promise<PlatformUser | null> {
    return this.prisma.platformUser.findUnique({
      where: {
        unique_platform_union_user: {
          platform,
          ptUnionId,
        },
      },
    });
  }

  async findById(id: string): Promise<PlatformUser | null> {
    return this.prisma.platformUser.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string): Promise<PlatformUser[]> {
    return this.prisma.platformUser.findMany({
      where: { user: { id: userId } },
    });
  }

  async findActivePlatformUsersByPlatform(
    platform: Platform,
  ): Promise<PlatformUser[]> {
    return this.prisma.platformUser.findMany({
      where: {
        platform,
        active: true,
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
      },
    });
  }

  async findByPlatformAndPhoneHashWithoutLocalUser(
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
      },
    });
  }

  async findByPlatformAndPhoneHash(
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
      },
    });
  }

  async updateLastSeenAt(id: string): Promise<PlatformUser> {
    return this.prisma.platformUser.update({
      where: { id },
      data: { lastSeenAt: new Date() },
    });
  }

  async deactivatePlatformUser(id: string): Promise<PlatformUser> {
    return this.prisma.platformUser.update({
      where: { id },
      data: { active: false },
    });
  }

  async activatePlatformUser(id: string): Promise<PlatformUser> {
    return this.prisma.platformUser.update({
      where: { id },
      data: { active: true },
    });
  }

  async deleteByCountryCodeAndPhone(
    countryCode: string,
    phone: string,
  ): Promise<{ count: number }> {
    return this.prisma.platformUser.deleteMany({
      where: {
        countryCode,
        phone,
      },
    });
  }

  async deleteById(id: string): Promise<PlatformUser> {
    return this.prisma.platformUser.delete({
      where: { id },
    });
  }
}
