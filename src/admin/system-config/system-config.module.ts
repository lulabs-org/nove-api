import { Module } from '@nestjs/common';
import { SystemConfigController } from './controllers';
import { SystemConfigRepository } from './repositories';
import {
  BootstrapService,
  SingleOrgContextService,
  SystemConfigService,
  TesterService,
} from './services';

@Module({
  controllers: [SystemConfigController],
  providers: [
    SystemConfigService,
    SystemConfigRepository,
    TesterService,
    BootstrapService,
    SingleOrgContextService,
  ],
  exports: [SystemConfigService, BootstrapService, SingleOrgContextService],
})
export class SystemConfigModule {}
