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
import { MeetingRecordingService } from './services/meeting-recording.service';
import { MeetingSummaryService } from './services/meeting-summary.service';
import { TranscriptService } from './services/transcript.service';
import { MeetingRepository } from './repositories/meeting.repository';
import { MeetingFileRepository } from './repositories/meeting-file.repository';
import { MeetingSummaryRepository } from './repositories/meeting-summary.repository';
import { MeetingRecordingRepository } from './repositories/meeting-recording.repository';
import { TranscriptRepository } from './repositories/transcript.repository';

import { MeetingParticipantRepository } from './repositories/meeting-participant.repository';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';

import { MeetingSummaryController } from './controllers/meeting-summary.controller';
import { ParticipantSummaryController } from './controllers/participant-summary.controller';
import { TranscriptController } from './controllers/transcript.controller';
import { MeetingRecordingController } from './controllers/meeting-recording.controller';
import { ParticipantSummaryCrudService } from './services/participant-summary-crud.service';
import { RecordingParticipantSummaryRepository } from '@/meet-ai/repositories';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [
    MeetingController,
    MeetingSummaryController,
    ParticipantSummaryController,
    TranscriptController,
    MeetingRecordingController,
  ],
  providers: [
    MeetingService,
    MeetingRecordingService,
    MeetingSummaryService,
    TranscriptService,
    MeetingRepository,
    MeetingFileRepository,
    MeetingSummaryRepository,
    MeetingRecordingRepository,
    TranscriptRepository,
    MeetingParticipantRepository,
    ParticipantSummaryCrudService,
    RecordingParticipantSummaryRepository,
  ],
  exports: [
    MeetingService,
    MeetingRecordingService,
    MeetingSummaryService,
    TranscriptService,
    MeetingRepository,
    MeetingFileRepository,
    MeetingSummaryRepository,
    MeetingRecordingRepository,
    TranscriptRepository,
    MeetingParticipantRepository,
    ParticipantSummaryCrudService,
  ],
})
export class MeetingModule {}
