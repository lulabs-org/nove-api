/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29 19:59:51
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-29 21:08:03
 * @FilePath: /nove_api/src/meet-ai/meet-ai.module.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Module } from '@nestjs/common';
import { MeetAiController } from './controllers/meet-ai.controller';
import { ParticipantSummaryService } from './services';
import { RecordingParticipantSummaryRepository } from './repositories';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmModule } from '@/llm/llm.module';
import { UserPlatformModule } from '@/user-platform/user-platform.module';
import { MeetingModule } from '@/meeting/meeting.module';
import { PeriodSummaryService } from './services/period-summary.service';

import { ConfigModule } from '@nestjs/config';
import { openaiConfig } from '@/configs/openai.config';
import { TasksModule } from '@/task/tasks.module';
import { PeriodSummaryHandler } from './handlers/period-summary.handler';
import { TrackingReportModule } from '@/tracking-report/tracking-report.module';

@Module({
  imports: [
    PrismaModule,
    LlmModule,
    MeetingModule,
    UserPlatformModule,
    ConfigModule.forFeature(openaiConfig),
    TasksModule,
    TrackingReportModule,
  ],
  controllers: [MeetAiController],
  providers: [
    RecordingParticipantSummaryRepository,
    ParticipantSummaryService,
    PeriodSummaryService,
    PeriodSummaryHandler,
  ],
  exports: [
    RecordingParticipantSummaryRepository,
    ParticipantSummaryService,
    PeriodSummaryService,
  ],
})
export class MeetAiModule {}
