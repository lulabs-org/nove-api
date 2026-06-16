import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { tencentMeetingConfig } from '@/configs/tencent-mtg.config';
import { TencentModule } from '@/integrations';
import { MeetingModule } from '@/meeting/meeting.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { TencentMtgController } from './tencent-mtg.controller';
import { TencentMtgSyncService } from './tencent-mtg-sync.service';

@Module({
  imports: [
    ConfigModule.forFeature(tencentMeetingConfig),
    TencentModule,
    MeetingModule,
    PrismaModule,
  ],
  controllers: [TencentMtgController],
  providers: [TencentMtgSyncService],
  exports: [TencentMtgSyncService],
})
export class TencentMtgModule {}
