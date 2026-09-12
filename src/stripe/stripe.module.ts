import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { PrismaModule } from '@/prisma/prisma.module';
import { UserModule } from '@/user/user.module';
import { WebhookLogModule } from '@/webhook-log/webhook-log.module';
import { IntegrationsModule } from '@/admin/integrations';
import { StripeWebhookController } from './controllers/stripe-webhook.controller';
import { StripeOrderController } from './controllers/stripe-order.controller';
import { StripeClientService } from './services/stripe-client.service';
import { StripeEventService } from './services/stripe-event.service';
import { StripeOrderSyncService } from './services/stripe-order-sync.service';
import { StripeRefundSyncService } from './services/stripe-refund-sync.service';
import { StripeRepository } from './repositories/stripe.repository';
import { StripeProcessor } from './processor/stripe.processor';
import { StripeTesterService } from './stripe.tester';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    WebhookLogModule,
    IntegrationsModule,
    BullModule.registerQueue({ name: 'stripe-sync' }),
    BullBoardModule.forFeature({
      name: 'stripe-sync',
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [StripeWebhookController, StripeOrderController],
  providers: [
    StripeClientService,
    StripeEventService,
    StripeOrderSyncService,
    StripeRefundSyncService,
    StripeRepository,
    StripeProcessor,
    StripeTesterService,
  ],
  exports: [
    StripeClientService,
    StripeOrderSyncService,
    StripeRefundSyncService,
    StripeRepository,
  ],
})
export class StripeModule {}
