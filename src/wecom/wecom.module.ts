import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { wecomConfig } from '@/configs/wecom.config';
import { WecomTokenService } from './service/wecom-token.service';
import { WecomClientService } from './service/wecom-client.service';
import { WecomCustomerService } from './service/wecom-customer.service';
import { WecomEventService } from './service/wecom-event.service';
import { WecomEventController } from './controllers/wecom-event.controller';

@Module({
  imports: [HttpModule, ConfigModule.forFeature(wecomConfig)],
  providers: [
    WecomTokenService,
    WecomClientService,
    WecomCustomerService,
    WecomEventService,
  ],
  controllers: [WecomEventController],
  exports: [WecomTokenService, WecomClientService],
})
export class WecomModule {}
