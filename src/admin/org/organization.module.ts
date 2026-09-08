import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';

import { OrganizationController } from './controllers/organization.controller';
import { OrganizationService } from './services/organization.service';
import { OrganizationRepository } from './repositories/organization.repository';
import { SingleOrgContextService } from './services/single-org-context.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [OrganizationController],
  providers: [
    OrganizationService,
    OrganizationRepository,
    SingleOrgContextService,
  ],
  exports: [
    OrganizationService,
    OrganizationRepository,
    SingleOrgContextService,
  ],
})
export class OrganizationModule {}
