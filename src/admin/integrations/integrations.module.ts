import { Module } from '@nestjs/common';
import { IntegrationsController } from './controllers';
import { IntegrationsRepository } from './repositories';
import {
  IntegrationsService,
  IntegrationTesterService,
} from './services';

@Module({
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    IntegrationsRepository,
    IntegrationTesterService,
  ],
  exports: [IntegrationsService, IntegrationTesterService],
})
export class IntegrationsModule {}

