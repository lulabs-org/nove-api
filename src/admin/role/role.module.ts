import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';

import { RoleController } from './controllers/role.controller';
import { RoleService } from './services/role.service';
import { RoleRepository } from './repositories/role.repository';
import { RoleGuard } from './guards/role.guard';

@Module({
  imports: [PrismaModule],
  controllers: [RoleController],
  providers: [RoleService, RoleRepository, RoleGuard],
  exports: [RoleService, RoleGuard],
})
export class RoleModule {}
