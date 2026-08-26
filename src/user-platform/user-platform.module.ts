import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { UserModule } from '@/user/user.module';

import { PlatformUserController } from './controllers/platform-user.controller';
import { PlatformUserService } from './services/platform-user.service';
import { PlatformUserRepository } from './repositories/platform-user.repository';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [PlatformUserController],
  providers: [PlatformUserService, PlatformUserRepository],
  exports: [PlatformUserService, PlatformUserRepository],
})
export class UserPlatformModule {}
