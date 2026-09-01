import { Module } from '@nestjs/common';
import { SystemConfigController } from './controllers';
import { SystemConfigRepository } from './repositories';
import {
  BootstrapService,
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
  ],
  exports: [SystemConfigService, BootstrapService],
})
export class SystemConfigModule { }
