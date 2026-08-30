import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ProjectController } from './controllers/project.controller';
import { ProjectRepository } from './repositories/project.repository';
import { ProjectService } from './services/project.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectController],
  providers: [ProjectService, ProjectRepository],
  exports: [ProjectService, ProjectRepository],
})
export class ProjectModule {}
