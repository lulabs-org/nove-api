import { Module } from '@nestjs/common';
import { SystemConfigController } from './controllers';
import { SystemConfigRepository } from './repositories';
import {
  SystemConfigEnvironmentBootstrapService,
  SystemConfigService,
  SystemConfigTesterService,
} from './services';

@Module({
  controllers: [SystemConfigController],
  providers: [
    SystemConfigService,
    SystemConfigRepository,
    SystemConfigTesterService,
    SystemConfigEnvironmentBootstrapService,
  ],
  exports: [SystemConfigService, SystemConfigEnvironmentBootstrapService],
})
export class SystemConfigModule {}
