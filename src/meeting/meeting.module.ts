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
import { TranscriptService } from './service/transcript.service';
import { MeetingRepository } from './repositories/meeting.repository';
import { MeetingFileRepository } from './repositories/meeting-file.repository';
import { MeetingSummaryRepository } from './repositories/meeting-summary.repository';
import { MeetingRecordingRepository } from './repositories/meeting-recording.repository';
import { TranscriptRepository } from './repositories/transcript.repository';

import { MeetingParticipantRepository } from './repositories/meeting-participant.repository';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [MeetingController],
  providers: [
    MeetingService,
    TranscriptService,
    MeetingRepository,
    MeetingFileRepository,
    MeetingSummaryRepository,
    MeetingRecordingRepository,
    TranscriptRepository,

    MeetingParticipantRepository,
  ],
  exports: [
    MeetingService,
    TranscriptService,
    MeetingRepository,
    MeetingFileRepository,
    MeetingSummaryRepository,
    MeetingRecordingRepository,
    TranscriptRepository,

    MeetingParticipantRepository,
  ],
})
export class MeetingModule {}
