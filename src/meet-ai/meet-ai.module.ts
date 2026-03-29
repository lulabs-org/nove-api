/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29 19:59:51
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-29 20:05:20
 * @FilePath: /nove_api/src/meet-ai/meet-ai.module.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */

import { Module } from '@nestjs/common';
import { MeetAiController } from './controllers/meet-ai.controller';
import { MeetAiService } from './services/meet-ai.service';
import { MeetAiRepository } from './repositories/meet-ai.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MeetAiController],
  providers: [MeetAiService, MeetAiRepository],
  exports: [MeetAiService],
})
export class MeetAiModule {}
