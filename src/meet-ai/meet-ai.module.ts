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
import { MeetAiRepository, ParticipantSummaryRepository } from './repositories';
import { PrismaModule } from '../prisma/prisma.module';
import { OpenaiModule } from '@/integrations/openai/openai.module';
import { UserModule } from '@/user/user.module';
import { MeetingModule } from '@/meeting/meeting.module';
import { UserPlatformModule } from '@/user-platform/user-platform.module';

@Module({
  imports: [
    PrismaModule,
    OpenaiModule,
    UserModule,
    MeetingModule,
    UserPlatformModule,
  ],
  controllers: [MeetAiController],
  providers: [
    MeetAiService,
    MeetAiRepository,
    ParticipantSummaryRepository,
    ParticipantSummaryService,
  ],
  exports: [
    MeetAiService,
    ParticipantSummaryRepository,
    ParticipantSummaryService,
  ],
})
export class MeetAiModule {}
