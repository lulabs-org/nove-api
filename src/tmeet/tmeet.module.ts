import { Module } from '@nestjs/common';
import { MeetingModule } from '@/meeting/meeting.module';
import { MinuteModule } from '@/minute/minute.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UserModule } from '@/user/user.module';
import { UserPlatformModule } from '@/user-platform/user-platform.module';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { SystemConfigModule } from '@/admin/system-config/system-config.module';

import {
  TencentApiService,
  TranscriptFormatterService,
  TranscriptService,
  SummaryService,
  ParticipantService,
  TencentMeetingTesterService,
} from './client';

import {
  TencentMtgController,
  TencentWebhookController,
} from './controllers';

import { TencentMtgSyncProcessor } from './processors/tencent-mtg-sync.processor';

import {
  TencentMtgSyncService,
  TencentMtgUserLinkService,
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
    // Client SDK Services
    TencentApiService,
    TranscriptFormatterService,
    TranscriptService,
    SummaryService,
    ParticipantService,
    TencentMeetingTesterService,

    // Sync & Business Services
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
    // Client SDK Exports
    TencentApiService,
    TranscriptFormatterService,
    TranscriptService,
    SummaryService,
    ParticipantService,

    // Business Service Exports
    TencentMtgSyncService,
    TencentMtgMeetingCoreService,
    TencentMtgSummaryCoreService,
    TencentMtgTranscriptCoreService,
    SpeakerService,
    MeetingParticipantService,
  ],
})
export class TMeetModule {}
