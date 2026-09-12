import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { StripeOrderSyncService } from '../services/stripe-order-sync.service';
import { StripeRefundSyncService } from '../services/stripe-refund-sync.service';

@Processor('stripe-sync')
export class StripeProcessor extends WorkerHost {
  private readonly logger = new Logger(StripeProcessor.name);

  constructor(
    private readonly orderSyncService: StripeOrderSyncService,
    private readonly refundSyncService: StripeRefundSyncService,
  ) {
    super();
  }

  async process(job: Job) {
    this.logger.log(`Processing BullMQ job: ${job.name} (id: ${job.id})`);

    try {
      switch (job.name) {
        case 'sync-payment-intents-page': {
          const result = await this.orderSyncService.processPaymentIntentsPage(
            job.data,
          );
          return result;
        }

        case 'sync-refunds-page': {
          const result = await this.refundSyncService.processRefundsPage(
            job.data,
          );
          return result;
        }

        case 'sync-single-order': {
          const data = job.data as { orderId: string };
          const result = await this.orderSyncService.syncSingle(data.orderId);
          return result;
        }

        case 'sync-single-refund': {
          const data = job.data as { refundId: string };
          const result = await this.refundSyncService.syncSingle(data.refundId);
          return result;
        }

        default:
          this.logger.warn(`Unknown job name: ${job.name}`);
          return { skipped: true };
      }
    } catch (error) {
      this.logger.error(`Failed to process Stripe job ${job.name}:`, error);
      throw error;
    }
  }
}
