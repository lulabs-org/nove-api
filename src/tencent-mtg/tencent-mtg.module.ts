import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { tencentMeetingConfig } from '@/configs/tencent-mtg.config';
import { TencentModule } from '@/integrations';
import { MeetingModule } from '@/meeting/meeting.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { LarkModule } from '@/integrations/lark/lark.module';
import { UserModule } from '@/user/user.module';
import { UserPlatformModule } from '@/user-platform/user-platform.module';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

import { TencentMtgController } from './controllers/tencent-mtg.controller';
import { TencentWebhookController } from './controllers/tencent-webhook.controller';

import { TencentMtgSyncProcessor } from './processors/tencent-mtg-sync.processor';

import { TencentMtgSyncService } from './services/sync.service';
import { TencentMtgUserLinkService } from './services/user-link.service';

import {
  TencentEventHandlerService,
  MeetingBitableService,
  TencentMtgMeetingCoreService,
  TencentMtgSummaryCoreService,
  TencentMtgTranscriptCoreService,
  ParticipantSummaryBitableService,
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
    ConfigModule.forFeature(tencentMeetingConfig),
    LarkModule,
    TencentModule,
    PrismaModule,
    UserModule,
    UserPlatformModule,
    MeetingModule,
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
    MeetingBitableService,

    SpeakerService,
    ParticipantSummaryBitableService,
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
