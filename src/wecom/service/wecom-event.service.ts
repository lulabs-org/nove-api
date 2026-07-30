import { Injectable, Logger } from '@nestjs/common';
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
    // TODO: 具体的客户变更业务逻辑
    await Promise.resolve();
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
