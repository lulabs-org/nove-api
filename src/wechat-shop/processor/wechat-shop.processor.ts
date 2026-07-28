import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { WechatShopOrderService } from '../service/wechat-shop-order.service';

@Processor('wechat-order-sync')
export class WechatShopProcessor extends WorkerHost {
  private readonly logger = new Logger(WechatShopProcessor.name);

  constructor(private readonly wechatShopOrderService: WechatShopOrderService) {
    super();
  }

  async process(job: Job<any>) {
    if (job.name === 'sync-single-order') {
      try {
        await this.wechatShopOrderService.syncSingle(job.data.orderId);
      } catch (error) {
        this.logger.error(`Failed to sync order ${job.data.orderId}`, error);
        throw error;
      }
    } else if (job.name === 'sync-history-range') {
      try {
        await this.wechatShopOrderService.processHistoryRange(job.data);
      } catch (error) {
        this.logger.error(`Failed to process history range`, error);
        throw error;
      }
    }
  }
}
