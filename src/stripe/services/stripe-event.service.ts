import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { StripeOrderSyncService } from './stripe-order-sync.service';
import { StripeRefundSyncService } from './stripe-refund-sync.service';

@Injectable()
export class StripeEventService {
  private readonly logger = new Logger(StripeEventService.name);

  constructor(
    private readonly orderSyncService: StripeOrderSyncService,
    private readonly refundSyncService: StripeRefundSyncService,
  ) {}

  async handleEvent(event: Stripe.Event) {
    this.logger.log(`Processing Stripe event: ${event.type} (id: ${event.id})`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        return this.orderSyncService.syncFromCheckoutSession(session);
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        return this.orderSyncService.syncFromPaymentIntent(paymentIntent);
      }

      case 'charge.succeeded': {
        const charge = event.data.object;
        return this.orderSyncService.syncFromCharge(charge);
      }

      case 'refund.created':
      case 'refund.updated': {
        const refund = event.data.object;
        return this.refundSyncService.syncFromRefund(refund);
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        if (charge.refunds && charge.refunds.data.length > 0) {
          const results: any[] = [];
          for (const refund of charge.refunds.data) {
            results.push(await this.refundSyncService.syncFromRefund(refund));
          }
          return { handled: true, refundsCount: results.length };
        }
        return { handled: true, message: 'No refund items in charge' };
      }

      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
        return { handled: false, unhandledType: event.type };
    }
  }
}
