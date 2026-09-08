import { Injectable } from '@nestjs/common';
import { Prisma, SystemConfig } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class SystemConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByKey(orgId: string, key: string): Promise<SystemConfig | null> {
    return this.prisma.systemConfig.findUnique({
      where: { orgId_key: { orgId, key } },
    });
  }

  async upsert(
    orgId: string,
    key: string,
    value: Prisma.InputJsonValue,
    isEncrypted: boolean,
    description: string,
  ): Promise<SystemConfig> {
    return this.prisma.systemConfig.upsert({
      where: { orgId_key: { orgId, key } },
      update: {
        value,
        isEncrypted,
      },
      create: {
        orgId,
        key,
        value,
        isEncrypted,
        description,
      },
    });
  }

  async delete(orgId: string, key: string): Promise<SystemConfig | null> {
    try {
      return await this.prisma.systemConfig.delete({
        where: { orgId_key: { orgId, key } },
      });
    } catch {
      // Return null if the record does not exist
      return null;
    }
  }
}
