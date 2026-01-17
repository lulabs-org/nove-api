import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';

import { DepartmentController } from './controllers/department.controller';
import { DepartmentService } from './services/department.service';
import { DepartmentRepository } from './repositories/department.repository';

@Module({
  imports: [PrismaModule],
  controllers: [DepartmentController],
  providers: [DepartmentService, DepartmentRepository],
  exports: [DepartmentService, DepartmentRepository],
})
export class DepartmentModule {}
