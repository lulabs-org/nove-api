import { forwardRef, Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { StorageModule } from '@/storage/storage.module';

import { OrganizationController } from './controllers';
import {
  OrganizationProfileService,
  OrganizationService,
  SingleOrgContextService,
} from './services';
import { OrganizationRepository } from './repositories/organization.repository';

@Global()
@Module({
  imports: [PrismaModule, forwardRef(() => StorageModule)],
  controllers: [OrganizationController],
  providers: [
    OrganizationService,
    OrganizationProfileService,
    OrganizationRepository,
    SingleOrgContextService,
  ],
  exports: [
    OrganizationService,
    OrganizationProfileService,
    OrganizationRepository,
    SingleOrgContextService,
  ],
})
export class OrganizationModule {}
