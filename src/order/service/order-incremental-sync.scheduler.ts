import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OrderService } from './order.service';

@Injectable()
export class OrderIncrementalSyncScheduler {
  private readonly logger = new Logger(OrderIncrementalSyncScheduler.name);

  constructor(private readonly orderService: OrderService) {}

  @Cron('0 5 * * * *', { timeZone: 'Asia/Shanghai' })
  async enqueueHourlyIncrementalSync(): Promise<void> {
    if (process.env.WECHAT_ORDER_INCREMENTAL_SYNC_ENABLED !== 'true') {
      return;
    }

    const lookbackHours = Number(
      process.env.WECHAT_ORDER_INCREMENTAL_LOOKBACK_HOURS ?? 2,
    );

    const result = await this.orderService.syncWechatOrderIncremental({
      lookbackHours: Number.isFinite(lookbackHours) ? lookbackHours : 2,
    });

    this.logger.log(
      `Synced WeChat order increments: fetched=${result.fetched}, created=${result.created}, updated=${result.updated}, failed=${result.failedCount}`,
    );
  }
}
