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
import { MeetingController } from './meeting.controller';
import { MeetingService } from './service/meeting.service';
import { MeetingRepository } from './repositories/meeting.repository';
import { MeetingFileRepository } from './repositories/meeting-file.repository';
import { MeetingSummaryRepository } from './repositories/meeting-summary.repository';
import { MeetingRecordingRepository } from './repositories/meeting-recording.repository';
import { TranscriptRepository } from './repositories/transcript.repository';
import { ParagraphRepository } from './repositories/paragraph.repository';
import { SentenceRepository } from './repositories/sentence.repository';
import { WordRepository } from './repositories/word.repository';
import { MeetingParticipantRepository } from './repositories/meeting-participant.repository';
import { MeetingParticipantService } from './service/meeting-participant.service';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [MeetingController],
  providers: [
    MeetingService,
    MeetingRepository,
    MeetingFileRepository,
    MeetingSummaryRepository,
    MeetingRecordingRepository,
    TranscriptRepository,
    ParagraphRepository,
    SentenceRepository,
    WordRepository,
    MeetingParticipantRepository,
    MeetingParticipantService,
  ],
  exports: [
    MeetingService,
    MeetingRepository,
    MeetingFileRepository,
    MeetingSummaryRepository,
    MeetingRecordingRepository,
    TranscriptRepository,
    ParagraphRepository,
    SentenceRepository,
    WordRepository,
    MeetingParticipantRepository,
    MeetingParticipantService,
  ],
})
export class MeetingModule {}
