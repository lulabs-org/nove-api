import { Module } from '@nestjs/common';
import { SystemConfigController } from './controllers';
import { SystemConfigRepository } from './repositories';
import {
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
    ConfigCodecService,
    SingleOrgContextService,
  ],
  exports: [SystemConfigService, SingleOrgContextService, TesterService],
})
export class SystemConfigModule {}
