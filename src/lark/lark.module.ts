import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { IntegrationsModule } from '@/admin/integrations';

import { LarkClient } from './client/lark.client';
import { LarkWebhookController } from './controllers/webhook.controller';
import { LarkWsEventListener } from './listeners';
import {
  LarkMeetingService,
  MinuteService,
  LarkTesterService,
} from './services';
import { LarkEventProcessor } from './queue/lark-event.processor';

@Module({
  imports: [
    IntegrationsModule,
    BullModule.registerQueue({ name: 'lark-events' }),
    BullBoardModule.forFeature({
      name: 'lark-events',
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [LarkWebhookController],
  providers: [
    LarkClient,
    MinuteService,
    LarkTesterService,
    LarkWsEventListener,
    LarkMeetingService,
    LarkEventProcessor,
  ],
  exports: [LarkClient, MinuteService, LarkMeetingService],
})
export class LarkModule {}
