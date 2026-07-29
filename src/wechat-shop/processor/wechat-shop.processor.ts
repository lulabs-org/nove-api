import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { WechatShopOrderService } from '../services/wechat-shop-order.service';
import { WechatShopAftersaleService } from '../services/wechat-shop-aftersale.service';

@Processor('wechat-order-sync')
export class WechatShopProcessor extends WorkerHost {
  private readonly logger = new Logger(WechatShopProcessor.name);

  constructor(
    private readonly wechatShopOrderService: WechatShopOrderService,
    private readonly wechatShopAftersaleService: WechatShopAftersaleService,
  ) {
    super();
  }

  async process(job: Job) {
    try {
      switch (job.name) {
        case 'sync-single-order': {
          const data = job.data as { orderId: string };
          await this.wechatShopOrderService.syncSingle(data.orderId);
          break;
        }

        case 'sync-single-aftersale': {
          const data = job.data as { afterSaleOrderId: string };
          await this.wechatShopAftersaleService.syncSingle(data.afterSaleOrderId);
          break;
        }

        case 'sync-history-range': {
          const data = job.data as Parameters<
            WechatShopOrderService['processHistoryRange']
          >[0];
          await this.wechatShopOrderService.processHistoryRange(data);
          break;
        }

        default:
          this.logger.warn(`Unknown job name: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process job ${job.name} (id: ${job.id})`,
        error,
      );
      throw error;
    }
  }
}
