import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { StorageModule } from '@/storage/storage.module';
import { SkillController } from './skill.controller';
import { SkillRepository } from './skill.repository';
import { SkillService } from './skill.service';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [SkillController],
  providers: [SkillRepository, SkillService],
})
export class SkillModule {}
