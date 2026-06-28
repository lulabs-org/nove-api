import { Module } from '@nestjs/common';
import { OrgIntegrationService } from './org-integration.service';
import { OrgIntegrationController } from './org-integration.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OrgIntegrationController],
  providers: [OrgIntegrationService],
  exports: [OrgIntegrationService],
})
export class OrgIntegrationModule {}
