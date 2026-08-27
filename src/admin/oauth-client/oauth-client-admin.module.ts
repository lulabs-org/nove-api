import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { OAuthClientAdminController } from './oauth-client-admin.controller';
import { OAuthClientAdminService } from './oauth-client-admin.service';

@Module({
  imports: [PrismaModule],
  controllers: [OAuthClientAdminController],
  providers: [OAuthClientAdminService],
})
export class OAuthClientAdminModule {}
