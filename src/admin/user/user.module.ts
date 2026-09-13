import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { DriveModule } from '@/drive/drive.module';
import { IdentityDocumentController } from './identity-document.controller';
import { IdentityDocumentService } from './identity-document.service';
import { AdminUserController } from './user.controller';
import { AdminUserRepository } from './user.repository';
import { AdminUserService } from './user.service';

@Module({
  imports: [PrismaModule, DriveModule],
  controllers: [AdminUserController, IdentityDocumentController],
  providers: [AdminUserRepository, AdminUserService, IdentityDocumentService],
})
export class AdminUserModule {}
