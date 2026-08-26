import { Module } from '@nestjs/common';
import { SystemConfigController } from './system-config.controller';
import { SystemConfigService } from './system-config.service';

import { SystemConfigRepository } from './system-config.repository';

@Module({
  controllers: [SystemConfigController],
  providers: [SystemConfigService, SystemConfigRepository],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}
