import { Module } from '@nestjs/common';
import { IntegrationsController } from './controllers';
import { IntegrationsRepository } from './repositories';
import {
  SingleOrgContextService,
  IntegrationsService,
  IntegrationTesterService,
} from './services';

@Module({
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    IntegrationsRepository,
    IntegrationTesterService,
    SingleOrgContextService,
  ],
  exports: [IntegrationsService, SingleOrgContextService, IntegrationTesterService],
})
export class IntegrationsModule {}

// Backward compatibility alias
export const SystemConfigModule = IntegrationsModule;
export type SystemConfigModule = IntegrationsModule;
