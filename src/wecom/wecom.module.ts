import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

import { wecomConfig } from '@/configs/wecom.config';
import { WecomTokenService } from './service/wecom-token.service';
import { WecomClientService } from './service/wecom-client.service';
import { WecomCustomerService } from './service/wecom-customer.service';
import { WecomEventService } from './service/wecom-event.service';
import { WecomEventController } from './controllers/wecom-event.controller';
import { WecomEventProcessor } from './processor/wecom-event.processor';
import { WecomRepository } from './repositories';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    ConfigModule.forFeature(wecomConfig),
    BullModule.registerQueue({ name: 'wecom-event' }),
    BullBoardModule.forFeature({
      name: 'wecom-event',
      adapter: BullMQAdapter,
    }),
  ],
  providers: [
    WecomRepository,
    WecomTokenService,
    WecomClientService,
    WecomCustomerService,
    WecomEventService,
    WecomEventProcessor,
  ],
  controllers: [WecomEventController],
  exports: [WecomTokenService, WecomClientService],
})
export class WecomModule {}
