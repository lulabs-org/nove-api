import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WecomEventService {
  private readonly logger = new Logger(WecomEventService.name);

  /**
   * 处理企业微信事件
   *
   * @param xmlMsg 解密后的 XML 字符串
   */
  async handleWecomEvent(xmlMsg: string): Promise<void> {
    try {
      // 业务层可以在这里使用 fast-xml-parser 等工具将 XML 转为 JSON 并分发处理
      this.logger.debug(`Received WeCom event: ${xmlMsg}`);
      await Promise.resolve();
    } catch (err) {
      this.logger.error('Failed to process WeCom event:', err);
    }
  }
}
