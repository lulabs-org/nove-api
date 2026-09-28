import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { StorageModule } from '@/storage/storage.module';
import { SkillController } from './skill.controller';
import { SkillService } from './skill.service';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [SkillController],
  providers: [SkillService],
})
export class SkillModule {}
