import { Module } from '@nestjs/common';
import { WecomTokenService } from './service/wecom-token.service';
import { WecomClientService } from './service/wecom-client.service';
import { WecomCustomerService } from './service/wecom-customer.service';
import { WecomEventService } from './service/wecom-event.service';
import { WecomEventController } from './controllers/wecom-event.controller';

@Module({
  providers: [
    WecomTokenService,
    WecomClientService,
    WecomCustomerService,
    WecomEventService,
  ],
  controllers: [WecomEventController],
})
export class WecomModule {}
