import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UserPhoneHashRepository } from '@/user/repositories/user-phone-hash.repository';
import { Platform } from '@prisma/client';

@Injectable()
export class TMeetUserLinkService {
  private readonly logger = new Logger(TMeetUserLinkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userPhoneHashRepo: UserPhoneHashRepository,
  ) {}

  /**
   * 通过手机号哈希值将腾讯会议平台用户（PlatformUser）关联到本地用户（User）。
   *
   * 匹配条件：
   * - PlatformUser.platform = TENCENT_MEETING
   * - PlatformUser.localUserId IS NULL（尚未关联本地用户）
   * - PlatformUser.ptUserId IS NULL（尚未获取到腾讯会议用户ID）
   * - PlatformUser.phoneHash 与 UserPhoneHash.hashValue 相同
   *
   * @returns 关联结果统计：成功关联数、跳过数（无 phoneHash）、总候选数
   */
  async linkUsersByPhoneHash(): Promise<{
    total: number;
    linked: number;
    skipped: number;
  }> {
    // 1. 查询满足条件的腾讯会议平台用户（未关联本地用户、ptUserId 为空，有 phoneHash）
    const unlinkedPlatformUsers = await this.prisma.platformUser.findMany({
      where: {
        platform: Platform.TENCENT_MEETING,
        localUserId: null,
        ptUserId: null,
        phoneHash: { not: null },
      },
      select: {
        id: true,
        phoneHash: true,
      },
    });

    const total = unlinkedPlatformUsers.length;
    this.logger.log(
      `Found ${total} unlinked TENCENT_MEETING PlatformUser(s) with phoneHash to process.`,
    );

    if (total === 0) {
      return { total: 0, linked: 0, skipped: 0 };
    }

    // 收集所有非空 phoneHash 用于批量查询
    const phoneHashes = unlinkedPlatformUsers
      .map((u) => u.phoneHash!)
      .filter(Boolean);

    // 2. 批量查询 UserPhoneHash 表，找出匹配的本地用户映射
    const phoneHashMappings = await this.userPhoneHashRepo.findManyByHashes(
      phoneHashes,
      Platform.TENCENT_MEETING,
    );

    // 构建 hashValue -> userId 的映射表（O(1) 查找）
    const hashToUserId = new Map<string, string>(
      phoneHashMappings.map((m) => [m.hashValue, m.userId]),
    );

    this.logger.log(
      `Found ${hashToUserId.size} matching UserPhoneHash record(s).`,
    );

    // 3. 收集所有需要更新的操作，批量提交事务
    const updateOps: { id: string; localUserId: string }[] = [];
    let skipped = 0;

    for (const platformUser of unlinkedPlatformUsers) {
      const matchedUserId = hashToUserId.get(platformUser.phoneHash!);
      if (!matchedUserId) {
        skipped++;
        continue;
      }
      updateOps.push({ id: platformUser.id, localUserId: matchedUserId });
    }

    const linked = updateOps.length;

    if (linked > 0) {
      await this.prisma.$transaction(
        updateOps.map(({ id, localUserId }) =>
          this.prisma.platformUser.update({
            where: { id },
            data: { localUserId },
          }),
        ),
      );

      this.logger.debug(
        `Batch linked ${linked} PlatformUser(s) via phoneHash in a single transaction.`,
      );
    }

    this.logger.log(
      `Link complete: total=${total}, linked=${linked}, skipped=${skipped}`,
    );

    return { total, linked, skipped };
  }
}


