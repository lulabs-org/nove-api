import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TencentModule } from '@/integrations/tencent-meeting/tencent.module';
import { MeetingModule } from '@/meeting/meeting.module';
import { SyncMeetingDetailController } from './controllers/sync-meeting-detail.controller';
import { SyncMeetingDetailService } from './services/sync-meeting-detail.service';

@Module({
  imports: [ConfigModule, TencentModule, MeetingModule],
  controllers: [SyncMeetingDetailController],
  providers: [SyncMeetingDetailService],
  exports: [SyncMeetingDetailService],
})
export class TencentMtgModule {}
