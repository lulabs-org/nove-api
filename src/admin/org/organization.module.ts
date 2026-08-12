import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';

import { OrganizationController } from './controllers/organization.controller';
import { OrganizationService } from './services/organization.service';
import { OrganizationRepository } from './repositories/organization.repository';

@Module({
  imports: [PrismaModule],
  controllers: [OrganizationController],
  providers: [OrganizationService, OrganizationRepository],
  exports: [OrganizationService, OrganizationRepository],
})
export class OrganizationModule {}
