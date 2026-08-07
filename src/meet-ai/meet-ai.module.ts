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
import { MeetAiService, ParticipantSummaryService } from './services';
import { ParticipantSummaryRepository } from './repositories';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmModule } from '@/llm/llm.module';
import { UserModule } from '@/user/user.module';
import { MeetingModule } from '@/meeting/meeting.module';
import { UserPlatformModule } from '@/user-platform/user-platform.module';
import { PeriodSummaryService } from './services/period-summary.service';
import { PeriodTimeRange } from './utils/period-time-range';
import { ConfigModule } from '@nestjs/config';
import { openaiConfig } from '@/configs/openai.config';
import { TasksModule } from '@/task/tasks.module';
import { PeriodSummaryHandler } from './handlers/period-summary.handler';

@Module({
  imports: [
    PrismaModule,
    LlmModule,
    UserModule,
    MeetingModule,
    UserPlatformModule,
    ConfigModule.forFeature(openaiConfig),
    TasksModule,
  ],
  controllers: [MeetAiController],
  providers: [
    MeetAiService,
    ParticipantSummaryRepository,
    ParticipantSummaryService,
    PeriodSummaryService,
    PeriodTimeRange,
    PeriodSummaryHandler,
  ],
  exports: [
    MeetAiService,
    ParticipantSummaryRepository,
    ParticipantSummaryService,
    PeriodSummaryService,
    PeriodTimeRange,
  ],
})
export class MeetAiModule {}
