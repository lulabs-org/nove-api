import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OrderSyncService } from './order-sync.service';

@Injectable()
export class OrderIncrementalSyncScheduler {
  private readonly logger = new Logger(OrderIncrementalSyncScheduler.name);

  constructor(private readonly orderSyncService: OrderSyncService) {}

  @Cron('0 5 * * * *', { timeZone: 'Asia/Shanghai' })
  async enqueueHourlyIncrementalSync(): Promise<void> {
    if (process.env.WECHAT_ORDER_INCREMENTAL_SYNC_ENABLED !== 'true') {
      return;
    }

    const lookbackHours = Number(
      process.env.WECHAT_ORDER_INCREMENTAL_LOOKBACK_HOURS ?? 2,
    );

    const job = await this.orderSyncService.enqueueWechatIncrementalSync({
      lookbackHours: Number.isFinite(lookbackHours) ? lookbackHours : 2,
    });

    this.logger.log(`Enqueued WeChat order incremental sync job ${job.id}`);
  }
}
