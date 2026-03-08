/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-01-03 10:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-09 01:27:53
 * @FilePath: /nove_api/src/tencent-mtg-hook/hook-tencent-mtg.module.ts
 * @Description: 腾讯会议模块，处理腾讯会议相关的Webhook事件
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TencentModule } from '@/integrations';
import { tencentMeetingConfig } from '@/configs/tencent-mtg.config';
import { PrismaModule } from '../prisma/prisma.module';
import { LarkModule } from '@/integrations/lark/lark.module';
import { OpenaiModule } from '@/integrations/openai/openai.module';
import { UserModule } from '@/user/user.module';
import { TencentWebhookController } from './controllers/tencent-webhook.controller';
import { TencentEventHandlerService } from './services/event-handler.service';
import { MeetingBitableService } from './services/meeting-bitable.service';
import { MeetingDatabaseService } from './services/meeting-database.service';
import { MeetingParticipantService } from './services/meeting-participant.service';
import { MeetingRepository } from '@/meeting/repositories/meeting.repository';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import {
  MeetingRecordingRepository,
  MeetingSummaryRepository,
  ParticipantSummaryRepository,
  TranscriptRepository,
  ParagraphRepository,
  SentenceRepository,
  WordRepository,
} from './repositories';
import { SpeakerService } from './services/speaker.service';
import { TranscriptBatchProcessor } from './services/transcript-batch-processor.service';

import {
  TencentUrlVerificationPipe,
  TencentWebhookDecryptionPipe,
} from './pipes';
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
    OpenaiModule,
    PrismaModule,
    UserModule,
  ],
  controllers: [TencentWebhookController],
  providers: [
    TencentEventHandlerService,
    EventHandlerFactory,
    MeetingBitableService,
    MeetingDatabaseService,
    MeetingParticipantService,
    SpeakerService,
    TranscriptBatchProcessor,
    MeetingStartedHandler,
    MeetingEndedHandler,
    RecordingCompletedHandler,
    MeetingParticipantJoinedHandler,
    SmartFullsummaryHandler,
    SmartTranscriptsHandler,
    SmartMinutesHandler,
    PlatformUserRepository,
    MeetingRepository,
    MeetingRecordingRepository,
    MeetingSummaryRepository,
    ParticipantSummaryRepository,
    TranscriptRepository,
    ParagraphRepository,
    SentenceRepository,
    WordRepository,
    TencentUrlVerificationPipe,
    TencentWebhookDecryptionPipe,
    // 提供 BaseEventHandler 数组的依赖注入配置
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
})
export class HookTencentMtgModule {}
