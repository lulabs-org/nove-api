import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

type CreatePlatformUserData = Prisma.PlatformUserCreateInput;
type UpdatePlatformUserData = Prisma.PlatformUserUpdateInput;

@Injectable()
export class WecomRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 平台用户幂等写入：存在则更新，不存在则创建。
   */
  async upsertPlatformUser(params: {
    where: Prisma.PlatformUserWhereUniqueInput;
    create: CreatePlatformUserData;
    update: UpdatePlatformUserData;
  }) {
    return this.prisma.platformUser.upsert({
      where: params.where,
      create: params.create,
      update: params.update,
    });
  }
}
