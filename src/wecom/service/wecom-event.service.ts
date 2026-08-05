import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { XMLParser } from 'fast-xml-parser';

import {
  WecomChangeExternalChatEvent,
  WecomChangeExternalContactEvent,
  WecomChangeExternalTagEvent,
} from '../types';

@Injectable()
export class WecomEventService {
  private readonly logger = new Logger(WecomEventService.name);
  private readonly xmlParser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false, // keep as string/node
  });

  constructor(
    @InjectQueue('wecom-event') private readonly wecomEventQueue: Queue,
  ) {}

  /**
   * 处理企业微信事件
   *
   * @param xmlMsg 解密后的 XML 字符串
   */
  async handleWecomEvent(xmlMsg: string): Promise<void> {
    try {
      const parsed: unknown = this.xmlParser.parse(xmlMsg);
      const parsedObj = parsed as { xml?: Record<string, unknown> };
      const eventData = parsedObj.xml; // wecom pushes data wrapped in <xml> tag

      if (!eventData) {
        this.logger.warn('Invalid WeCom event XML: missing <xml> root');
        return;
      }

      this.logger.debug(`Received WeCom event: ${JSON.stringify(eventData)}`);

      const eventType = String(eventData.Event);

      switch (eventType) {
        case 'change_external_contact':
          await this.handleChangeExternalContact(
            eventData as unknown as WecomChangeExternalContactEvent,
          );
          break;
        case 'change_external_chat':
          await this.handleChangeExternalChat(
            eventData as unknown as WecomChangeExternalChatEvent,
          );
          break;
        case 'change_external_tag':
          await this.handleChangeExternalTag(
            eventData as unknown as WecomChangeExternalTagEvent,
          );
          break;
        default:
          this.logger.debug(`Ignored WeCom event type: ${eventType}`);
          break;
      }
    } catch (err) {
      this.logger.error('Failed to process WeCom event:', err);
    }
  }

  private async handleChangeExternalContact(
    event: WecomChangeExternalContactEvent,
  ) {
    this.logger.log(
      `External contact changed: [${event.ChangeType}] UserID=${event.UserID}, ExternalUserID=${event.ExternalUserID}`,
    );

    // 对于新增、编辑联系人的事件，推入异步队列进行拉取最新详情并同步到数据库
    if (
      event.ChangeType === 'add_external_contact' ||
      event.ChangeType === 'edit_external_contact' ||
      event.ChangeType === 'add_half_external_contact'
    ) {
      await this.wecomEventQueue
        .add(
          'sync_external_contact',
          { externalUserId: event.ExternalUserID },
          {
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 }, // 失败后指数退避重试
          },
        )
        .catch((e: Error) => {
          this.logger.error(`Failed to enqueue sync contact job: ${e.message}`);
        });
    } else if (
      event.ChangeType === 'del_external_contact' ||
      event.ChangeType === 'del_follow_user'
    ) {
      // TODO: 处理删除事件，比如在 PlatformUser 中标记为删除或取消特定跟进关系
      this.logger.log(
        `Handling deletion for ExternalUserID=${event.ExternalUserID}`,
      );
    }
  }

  private async handleChangeExternalChat(event: WecomChangeExternalChatEvent) {
    this.logger.log(
      `External chat changed: [${event.ChangeType}] ChatId=${event.ChatId}`,
    );
    // TODO: 具体的客户群变更业务逻辑
    await Promise.resolve();
  }

  private async handleChangeExternalTag(event: WecomChangeExternalTagEvent) {
    this.logger.log(
      `External tag changed: [${event.ChangeType}] Id=${event.Id}, TagType=${event.TagType}`,
    );
    // TODO: 具体的客户标签变更业务逻辑
    await Promise.resolve();
  }
}
