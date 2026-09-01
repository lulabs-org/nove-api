import { Module } from '@nestjs/common';
import { SystemConfigController } from './controllers';
import { SystemConfigRepository } from './repositories';
import {
  BootstrapService,
  ConfigCodecService,
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
    ConfigCodecService,
    SingleOrgContextService,
  ],
  exports: [SystemConfigService, BootstrapService, SingleOrgContextService],
})
export class SystemConfigModule {}
