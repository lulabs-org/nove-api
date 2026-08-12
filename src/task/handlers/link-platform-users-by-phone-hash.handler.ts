import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Platform } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { ITaskHandler } from './task-handler.interface';
import { TaskHandlerRegistry } from './task-handler.registry';

const DEFAULT_BATCH_SIZE = 500;
const MAX_BATCH_SIZE = 2000;

interface LinkPlatformUsersPayload {
  platform?: Platform;
  batchSize?: number;
}

@Injectable()
export class LinkPlatformUsersByPhoneHashHandler
  implements ITaskHandler, OnModuleInit
{
  private readonly logger = new Logger(
    LinkPlatformUsersByPhoneHashHandler.name,
  );
  readonly name = 'link_platform_users_by_phone_hash';

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: TaskHandlerRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async handle(job: Job): Promise<unknown> {
    const { platform, batchSize } = this.parsePayload(job.data);
    let lastProcessedId: string | undefined;
    let candidates = 0;
    let linked = 0;
    let unmatched = 0;
    let skipped = 0;
    let batches = 0;

    this.logger.log(
      `[${this.name}] Starting job ${job.id ?? 'unknown'} for ${platform ?? 'all platforms'}.`,
    );

    while (true) {
      const platformUsers = await this.prisma.platformUser.findMany({
        where: {
          localUserId: null,
          phoneHash: { not: null },
          deletedAt: null,
          ...(platform ? { platform } : {}),
          ...(lastProcessedId ? { id: { gt: lastProcessedId } } : {}),
        },
        select: {
          id: true,
          platform: true,
          phoneHash: true,
        },
        orderBy: { id: 'asc' },
        take: batchSize,
      });

      if (platformUsers.length === 0) break;

      batches++;
      candidates += platformUsers.length;
      lastProcessedId = platformUsers.at(-1)!.id;

      const hashesByPlatform = new Map<Platform, Set<string>>();
      for (const platformUser of platformUsers) {
        if (!platformUser.phoneHash) continue;
        const hashes = hashesByPlatform.get(platformUser.platform) ?? new Set();
        hashes.add(platformUser.phoneHash);
        hashesByPlatform.set(platformUser.platform, hashes);
      }

      const phoneHashMappings = await this.prisma.userPhoneHash.findMany({
        where: {
          OR: [...hashesByPlatform.entries()].map(
            ([mappingPlatform, hashes]) => ({
              platform: mappingPlatform,
              hashValue: { in: [...hashes] },
            }),
          ),
        },
        select: {
          platform: true,
          hashValue: true,
          userId: true,
        },
      });

      const userIdByPlatformAndHash = new Map(
        phoneHashMappings.map((mapping) => [
          this.mappingKey(mapping.platform, mapping.hashValue),
          mapping.userId,
        ]),
      );
      const updates = platformUsers.flatMap((platformUser) => {
        const userId = platformUser.phoneHash
          ? userIdByPlatformAndHash.get(
              this.mappingKey(platformUser.platform, platformUser.phoneHash),
            )
          : undefined;

        if (!userId) {
          unmatched++;
          return [];
        }

        return [{ id: platformUser.id, localUserId: userId }];
      });

      if (updates.length === 0) continue;

      const updateResults = await this.prisma.$transaction(
        updates.map(({ id, localUserId }) =>
          this.prisma.platformUser.updateMany({
            where: { id, localUserId: null, deletedAt: null },
            data: { localUserId },
          }),
        ),
      );

      const batchLinked = updateResults.reduce(
        (total, result) => total + result.count,
        0,
      );
      linked += batchLinked;
      skipped += updates.length - batchLinked;
    }

    this.logger.log(
      `[${this.name}] Finished: candidates=${candidates}, linked=${linked}, unmatched=${unmatched}, skipped=${skipped}.`,
    );

    return {
      success: true,
      platform: platform ?? 'ALL',
      candidates,
      linked,
      unmatched,
      skipped,
      batches,
    };
  }

  private parsePayload(
    data: unknown,
  ): Required<Pick<LinkPlatformUsersPayload, 'batchSize'>> &
    Pick<LinkPlatformUsersPayload, 'platform'> {
    const payload =
      data && typeof data === 'object'
        ? (data as Record<string, unknown>)
        : ({} as Record<string, unknown>);
    const platform = payload.platform;
    const batchSize = payload.batchSize ?? DEFAULT_BATCH_SIZE;

    if (
      platform !== undefined &&
      (typeof platform !== 'string' ||
        !Object.values(Platform).includes(platform as Platform))
    ) {
      const invalidPlatform =
        typeof platform === 'string'
          ? platform
          : (JSON.stringify(platform) ?? typeof platform);
      throw new Error(`Invalid platform: ${invalidPlatform}`);
    }

    if (
      typeof batchSize !== 'number' ||
      !Number.isInteger(batchSize) ||
      batchSize < 1 ||
      batchSize > MAX_BATCH_SIZE
    ) {
      throw new Error(
        `batchSize must be an integer between 1 and ${MAX_BATCH_SIZE}`,
      );
    }

    return { platform: platform as Platform | undefined, batchSize };
  }

  private mappingKey(platform: Platform, phoneHash: string): string {
    return `${platform}:${phoneHash}`;
  }
}
