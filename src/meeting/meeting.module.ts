/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-07-07 03:42:31
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-30 14:27:45
 * @FilePath: /nove_api/src/meeting/meeting.module.ts
 * @Description:
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { Module } from '@nestjs/common';
import { MeetingController } from './controllers/meeting.controller';
import { MeetingService } from './services/meeting.service';
import { MinuteService } from './services/meeting-recording.service';
import { MinuteSummaryService } from './services/meeting-summary.service';
import { TranscriptService } from './services/transcript.service';
import { MeetingRepository } from './repositories/meeting.repository';
import { MeetingFileRepository } from './repositories/meeting-file.repository';
import { MinuteSummaryRepository } from './repositories/meeting-summary.repository';
import { MinuteRepository } from './repositories/meeting-recording.repository';
import { TranscriptRepository } from './repositories/transcript.repository';

import { MeetingParticipantRepository } from './repositories/meeting-participant.repository';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmModule } from '@/llm/llm.module';
import { ConfigModule } from '@nestjs/config';
import { openaiConfig } from '@/configs/openai.config';

import { MinuteSummaryController } from './controllers/meeting-summary.controller';
import { ParticipantSummaryController } from './controllers/participant-summary.controller';
import { TranscriptController } from './controllers/transcript.controller';
import { MinuteController } from './controllers/meeting-recording.controller';
import { ParticipantSummaryCrudService } from './services/participant-summary-crud.service';
import { ParticipantSummaryService } from './services/participant-summary.service';
import { MinuteParticipantSummaryRepository } from './repositories';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    LlmModule,
    ConfigModule.forFeature(openaiConfig),
  ],
  controllers: [
    MeetingController,
    MinuteSummaryController,
    ParticipantSummaryController,
    TranscriptController,
    MinuteController,
  ],
  providers: [
    MeetingService,
    MinuteService,
    MinuteSummaryService,
    TranscriptService,
    MeetingRepository,
    MeetingFileRepository,
    MinuteSummaryRepository,
    MinuteRepository,
    TranscriptRepository,
    MeetingParticipantRepository,
    ParticipantSummaryCrudService,
    ParticipantSummaryService,
    MinuteParticipantSummaryRepository,
  ],
  exports: [
    MeetingService,
    MinuteService,
    MinuteSummaryService,
    TranscriptService,
    MeetingRepository,
    MeetingFileRepository,
    MinuteSummaryRepository,
    MinuteRepository,
    TranscriptRepository,
    MeetingParticipantRepository,
    ParticipantSummaryCrudService,
    ParticipantSummaryService,
    MinuteParticipantSummaryRepository,
  ],
})
export class MeetingModule {}
