import { Module } from '@nestjs/common';
import { TencentModule } from '@/integrations';
import { MeetingModule } from '@/meeting/meeting.module';
import { MinuteModule } from '@/minute/minute.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UserModule } from '@/user/user.module';
import { UserPlatformModule } from '@/user-platform/user-platform.module';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { SystemConfigModule } from '@/admin/system-config/system-config.module';

import { TencentMtgController } from './controllers/tencent-mtg.controller';
import { TencentWebhookController } from './controllers/tencent-webhook.controller';

import { TencentMtgSyncProcessor } from './processors/tencent-mtg-sync.processor';

import { TencentMtgSyncService } from './services/sync.service';
import { TencentMtgUserLinkService } from './services/user-link.service';

import {
  TencentEventHandlerService,
  TencentMtgMeetingCoreService,
  TencentMtgSummaryCoreService,
  TencentMtgTranscriptCoreService,
  SpeakerService,
  MeetingParticipantService,
} from './services';

import { UrlVerificationPipe, BodyDecryptionPipe } from './pipes';

import {
  MeetingStartedHandler,
  EventHandlerFactory,
  MeetingEndedHandler,
  RecordingCompletedHandler,
  MeetingParticipantJoinedHandler,
  SmartFullsummaryHandler,
  SmartTranscriptsHandler,
  SmartMinutesHandler,
} from './handlers';

@Module({
  imports: [
    SystemConfigModule,
    TencentModule,
    PrismaModule,
    UserModule,
    UserPlatformModule,
    MeetingModule,
    MinuteModule,
    BullModule.registerQueue({
      name: 'tencent-mtg-sync',
    }),
    BullBoardModule.forFeature({
      name: 'tencent-mtg-sync',
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [TencentMtgController, TencentWebhookController],
  providers: [
    // Sync Services
    TencentMtgSyncService,
    TencentMtgMeetingCoreService,
    TencentMtgSummaryCoreService,
    TencentMtgTranscriptCoreService,
    TencentMtgUserLinkService,
    TencentMtgSyncProcessor,

    // Webhook & Shared Services
    TencentEventHandlerService,
    EventHandlerFactory,

    SpeakerService,
    MeetingParticipantService,

    // Handlers
    MeetingStartedHandler,
    MeetingEndedHandler,
    RecordingCompletedHandler,
    MeetingParticipantJoinedHandler,
    SmartFullsummaryHandler,
    SmartTranscriptsHandler,
    SmartMinutesHandler,

    // Pipes
    UrlVerificationPipe,
    BodyDecryptionPipe,

    // BaseEventHandler[] Injection
    {
      provide: 'BaseEventHandler[]',
      useFactory: (
        meetingStartedHandler: MeetingStartedHandler,
        meetingEndedHandler: MeetingEndedHandler,
        recordingCompletedHandler: RecordingCompletedHandler,
        meetingParticipantJoinedHandler: MeetingParticipantJoinedHandler,
        smartFullsummaryHandler: SmartFullsummaryHandler,
        smartTranscriptsHandler: SmartTranscriptsHandler,
        smartMinutesHandler: SmartMinutesHandler,
      ) => [
        meetingStartedHandler,
        meetingEndedHandler,
        recordingCompletedHandler,
        meetingParticipantJoinedHandler,
        smartFullsummaryHandler,
        smartTranscriptsHandler,
        smartMinutesHandler,
      ],
      inject: [
        MeetingStartedHandler,
        MeetingEndedHandler,
        RecordingCompletedHandler,
        MeetingParticipantJoinedHandler,
        SmartFullsummaryHandler,
        SmartTranscriptsHandler,
        SmartMinutesHandler,
      ],
    },
  ],
  exports: [
    TencentMtgSyncService,
    TencentMtgMeetingCoreService,
    TencentMtgSummaryCoreService,
    TencentMtgTranscriptCoreService,
    SpeakerService,
    MeetingParticipantService,
  ],
})
export class TencentMtgModule {}
