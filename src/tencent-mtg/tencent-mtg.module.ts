import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { tencentMeetingConfig } from '@/configs/tencent-mtg.config';
import { TencentModule } from '@/integrations';
import { MeetingModule } from '@/meeting/meeting.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { TencentMtgController } from './tencent-mtg.controller';
import { TencentMtgSyncService } from './tencent-mtg-sync.service';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { TencentMtgSyncProcessor } from './tencent-mtg-sync.processor';

@Module({
  imports: [
    ConfigModule.forFeature(tencentMeetingConfig),
    TencentModule,
    MeetingModule,
    PrismaModule,
    BullModule.registerQueue({
      name: 'tencent-mtg-sync',
    }),
    BullBoardModule.forFeature({
      name: 'tencent-mtg-sync',
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [TencentMtgController],
  providers: [TencentMtgSyncService, TencentMtgSyncProcessor],
  exports: [TencentMtgSyncService],
})
export class TencentMtgModule {}
