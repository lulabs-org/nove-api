import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  OrderSyncService,
  ORDER_SYNC_QUEUE,
} from '../service/order-sync.service';

interface OrderSyncJobPayload {
  orderSyncJobId?: string;
}

@Injectable()
@Processor(ORDER_SYNC_QUEUE)
export class OrderSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderSyncProcessor.name);

  constructor(private readonly orderSyncService: OrderSyncService) {
    super();
  }

  override async process(
    job: Job<OrderSyncJobPayload, unknown, string>,
  ): Promise<unknown> {
    if (!job.data.orderSyncJobId) {
      throw new Error('orderSyncJobId is required');
    }

    this.logger.log(
      `Processing WeChat order sync job ${job.data.orderSyncJobId}`,
    );

    return this.orderSyncService.processWechatSyncJob(job.data.orderSyncJobId);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<OrderSyncJobPayload> | undefined, error: Error): void {
    this.logger.error(
      `Order sync queue job ${job?.id ?? 'unknown'} failed: ${error.message}`,
    );
  }
}
