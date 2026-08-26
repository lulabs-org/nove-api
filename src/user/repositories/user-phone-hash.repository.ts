import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UserPhoneHash, Platform, Prisma } from '@prisma/client';

@Injectable()
export class UserPhoneHashRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a user phone hash record by its hash value
   */
  async findByHash(hashValue: string): Promise<UserPhoneHash | null> {
    return this.prisma.userPhoneHash.findUnique({
      where: { hashValue },
    });
  }

  /**
   * Find many user phone hash records by a list of hash values
   */
  async findManyByHashes(
    hashValues: string[],
    platform?: Platform,
  ): Promise<Pick<UserPhoneHash, 'hashValue' | 'userId'>[]> {
    return this.prisma.userPhoneHash.findMany({
      where: {
        hashValue: { in: hashValues },
        ...(platform ? { platform } : {}),
      },
      select: {
        hashValue: true,
        userId: true,
      },
    });
  }

  /**
   * Find many user phone hash records with generic arguments
   */
  async findMany(args: Prisma.UserPhoneHashFindManyArgs) {
    return this.prisma.userPhoneHash.findMany(args);
  }

  /**
   * Upsert a user phone hash record
   */
  async upsertHash(
    userId: string,
    platform: Platform,
    hashValue: string,
  ): Promise<UserPhoneHash> {
    return this.prisma.userPhoneHash.upsert({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
      create: {
        userId,
        hashValue,
        platform,
      },
      update: {
        hashValue,
      },
    });
  }
}
