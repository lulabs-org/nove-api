import { Injectable, Logger } from '@nestjs/common';
import { Platform, Prisma } from '@prisma/client';

import { WecomRepository } from '../repositories';
import { WecomClientService } from './wecom-client.service';

@Injectable()
export class WecomCustomerService {
  private readonly logger = new Logger(WecomCustomerService.name);

  constructor(
    private readonly wecomRepository: WecomRepository,
    private readonly wecomClientService: WecomClientService,
  ) {}

  /**
   * 同步外部联系人到本地数据库 (PlatformUser)
   *
   * @param externalUserId 企微客户的 external_userid
   */
  async syncExternalContact(externalUserId: string): Promise<void> {
    try {
      this.logger.debug(`Syncing WeCom external contact: ${externalUserId}`);

      // 1. 获取客户详情
      const { external_contact: contact, follow_user: follows } =
        await this.wecomClientService.getExternalContact(externalUserId);

      // 2. 将数据合并并 Upsert 到 PlatformUser 表
      await this.wecomRepository.upsertPlatformUser({
        where: {
          unique_platform_union_user: {
            platform: Platform.WECOM,
            ptUnionId: contact.unionid || contact.external_userid, // 如果没有 unionid，就用 external_userid 作为 fallback
          },
        },
        create: {
          platform: Platform.WECOM,
          ptUserId: contact.external_userid,
          ptUnionId: contact.unionid || contact.external_userid,
          displayName: contact.name,
          avatarUrl: contact.avatar,
          platformData: {
            type: contact.type,
            gender: contact.gender,
            position: contact.position,
            corp_name: contact.corp_name,
            corp_full_name: contact.corp_full_name,
            external_profile: contact.external_profile,
            // 由于目前不建跟进表，先暂时把 follows 存到 platformData，避免丢失
            follow_user: follows,
          } as unknown as Prisma.InputJsonObject,
        },
        update: {
          ptUserId: contact.external_userid,
          displayName: contact.name,
          avatarUrl: contact.avatar,
          platformData: {
            type: contact.type,
            gender: contact.gender,
            position: contact.position,
            corp_name: contact.corp_name,
            corp_full_name: contact.corp_full_name,
            external_profile: contact.external_profile,
            follow_user: follows,
          } as unknown as Prisma.InputJsonObject,
        },
      });

      this.logger.log(
        `Successfully synced WeCom external contact: ${externalUserId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync WeCom external contact ${externalUserId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // 可以选择抛出错误让上层（或队列重试），这里为了不中断流程，仅打印日志
      throw error;
    }
  }
}
