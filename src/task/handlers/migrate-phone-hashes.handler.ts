import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import * as crypto from 'crypto';
import { Platform } from '@prisma/client';
import { ITaskHandler } from './task-handler.interface';
import { TaskHandlerRegistry } from './task-handler.registry';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MigratePhoneHashesHandler implements ITaskHandler, OnModuleInit {
  private readonly logger = new Logger(MigratePhoneHashesHandler.name);
  readonly name = 'migrate_phone_hashes';

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: TaskHandlerRegistry,
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  private encryptPhone(phone: string): string {
    const secretId = process.env.TENCENT_MEETING_SECRET_ID || '';
    return crypto
      .createHash('sha256')
      .update(`${phone}/${secretId}`)
      .digest('hex');
  }

  async handle(_job: Job): Promise<unknown> {
    this.logger.log(
      `[${this.name}] Starting phone hash migration job ${_job.id}...`,
    );

    // 1. Find all users with a phone number
    const usersWithPhone = await this.prisma.user.findMany({
      where: {
        phone: { not: null },
      },
      select: {
        id: true,
        phone: true,
      },
    });

    this.logger.log(
      `[${this.name}] Found ${usersWithPhone.length} users with phone numbers.`,
    );

    let successCount = 0;
    let errorCount = 0;

    // 2. Iterate and upsert the hashes
    for (const user of usersWithPhone) {
      if (!user.phone) continue;

      try {
        const hashValue = this.encryptPhone(user.phone);

        await this.prisma.userPhoneHash.upsert({
          where: {
            userId_platform: {
              userId: user.id,
              platform: Platform.TENCENT_MEETING,
            },
          },
          create: {
            userId: user.id,
            hashValue: hashValue,
            platform: Platform.TENCENT_MEETING,
          },
          update: {
            hashValue: hashValue,
          },
        });

        successCount++;
      } catch (error: unknown) {
        const err = error as Error;
        this.logger.error(
          `[${this.name}] Error migrating user ${user.id}: ${err.message}`,
        );
        errorCount++;
      }
    }

    this.logger.log(
      `[${this.name}] Migration finished. Success: ${successCount}, Failures: ${errorCount}`,
    );

    return {
      success: true,
      migrated: successCount,
      errors: errorCount,
    };
  }
}
