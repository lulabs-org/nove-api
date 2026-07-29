import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { WechatShopOrderService } from '../service/wechat-shop-order.service';
import { WechatShopAftersaleService } from '../service/wechat-shop-aftersale.service';

@Processor('wechat-order-sync')
export class WechatShopProcessor extends WorkerHost {
  private readonly logger = new Logger(WechatShopProcessor.name);

  constructor(
    private readonly wechatShopOrderService: WechatShopOrderService,
    private readonly wechatShopAftersaleService: WechatShopAftersaleService,
  ) {
    super();
  }

  async process(job: Job<unknown>) {
    if (job.name === 'sync-single-order') {
      const data = job.data as { orderId: string };
      try {
        await this.wechatShopOrderService.syncSingle(data.orderId);
      } catch (error) {
        this.logger.error(`Failed to sync order ${data.orderId}`, error);
        throw error;
      }
    } else if (job.name === 'sync-single-aftersale') {
      const data = job.data as { afterSaleOrderId: string };
      try {
        await this.wechatShopAftersaleService.syncSingle(data.afterSaleOrderId);
      } catch (error) {
        this.logger.error(
          `Failed to sync aftersale ${data.afterSaleOrderId}`,
          error,
        );
        throw error;
      }
    } else if (job.name === 'sync-history-range') {
      const data = job.data as Parameters<
        WechatShopOrderService['processHistoryRange']
      >[0];
      try {
        await this.wechatShopOrderService.processHistoryRange(data);
      } catch (error) {
        this.logger.error(`Failed to process history range`, error);
        throw error;
      }
    }
  }
}
