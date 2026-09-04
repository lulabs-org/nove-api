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
  TMeetTesterService,
} from './client';

import {
  TMeetController,
  TMeetWebhookController,
} from './controllers';

import { TMeetSyncProcessor } from './processors/tmeet-sync.processor';

import {
  TMeetSyncService,
  TMeetUserLinkService,
  TMeetEventHandlerService,
  TMeetMeetingCoreService,
  TMeetSummaryCoreService,
  TMeetTranscriptCoreService,
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
      name: 'tmeet-sync',
    }),
    BullBoardModule.forFeature({
      name: 'tmeet-sync',
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [TMeetController, TMeetWebhookController],
  providers: [
    // Client SDK Services
    TencentApiService,
    TranscriptFormatterService,
    TranscriptService,
    SummaryService,
    ParticipantService,
    TMeetTesterService,

    // Sync & Business Services
    TMeetSyncService,
    TMeetMeetingCoreService,
    TMeetSummaryCoreService,
    TMeetTranscriptCoreService,
    TMeetUserLinkService,
    TMeetSyncProcessor,

    // Webhook & Shared Services
    TMeetEventHandlerService,
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
    TMeetSyncService,
    TMeetMeetingCoreService,
    TMeetSummaryCoreService,
    TMeetTranscriptCoreService,
    SpeakerService,
    MeetingParticipantService,
  ],
})
export class TMeetModule {}
