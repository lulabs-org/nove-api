import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AdminUserController } from './user.controller';
import { AdminUserRepository } from './user.repository';
import { AdminUserService } from './user.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminUserController],
  providers: [AdminUserRepository, AdminUserService],
})
export class AdminUserModule {}
