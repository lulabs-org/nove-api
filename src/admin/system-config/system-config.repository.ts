import { Injectable } from '@nestjs/common';
import { Prisma, SystemConfig } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class SystemConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByKey(key: string): Promise<SystemConfig | null> {
    return this.prisma.systemConfig.findUnique({
      where: { key },
    });
  }

  async upsert(
    key: string,
    value: Prisma.InputJsonValue,
    isEncrypted: boolean,
    description: string,
  ): Promise<SystemConfig> {
    return this.prisma.systemConfig.upsert({
      where: { key },
      update: {
        value,
        isEncrypted,
      },
      create: {
        key,
        value,
        isEncrypted,
        description,
      },
    });
  }
}
