import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { tencentMeetingConfig } from '@/configs/tencent-mtg.config';
import { TencentModule } from '@/integrations';
import { MeetingModule } from '@/meeting/meeting.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { TencentMtgController } from './tencent-mtg.controller';
import { TencentMtgSyncService } from './services/tencent-mtg-sync.service';
import { TencentMtgMeetingSyncService } from './services/tencent-mtg-meeting-sync.service';
import { TencentMtgTranscriptSyncService } from './services/tencent-mtg-transcript-sync.service';
import { TencentMtgSummarySyncService } from './services/tencent-mtg-summary-sync.service';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { TencentMtgSyncProcessor } from './tencent-mtg-sync.processor';
import { TencentMtgUserLinkService } from './services/tencent-mtg-user-link.service';
import { HookTencentMtgModule } from '@/tencent-mtg-hook/hook-tencent-mtg.module';

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
    HookTencentMtgModule,
  ],
  controllers: [TencentMtgController],
  providers: [
    TencentMtgSyncService,
    TencentMtgMeetingSyncService,
    TencentMtgTranscriptSyncService,
    TencentMtgSummarySyncService,
    TencentMtgSyncProcessor,
    TencentMtgUserLinkService,
  ],
  exports: [TencentMtgSyncService],
})
export class TencentMtgModule {}
