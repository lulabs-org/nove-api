/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-03 05:55:35
 * @LastEditors: Mingxuan 159552597+Luckymingxuan@users.noreply.github.com
 * @LastEditTime: 2026-02-02 21:03:01
 * @FilePath: \nove-api\src\task\tasks.module.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

// src/tasks/tasks.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { TasksController } from './tasks.controller';
import { TasksService } from './service/tasks.service';
import { TaskProcessor } from './processors/task.processor';
import { PrismaService } from '../prisma/prisma.service';
import { OpenaiModule } from '../integrations/openai/openai.module';
import { MeetAiModule } from '../meet-ai/meet-ai.module';

import { ConfigModule } from '@nestjs/config';
import { openaiConfig } from '../configs/openai.config';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'tasks', // 队列名
    }),
    BullBoardModule.forFeature({
      name: 'tasks',
      adapter: BullMQAdapter,
    }),
    OpenaiModule,
    ConfigModule.forFeature(openaiConfig),
    MeetAiModule,
  ],
  controllers: [TasksController],
  providers: [
    TasksService,
    TaskProcessor,
    PrismaService,
  ],
})
export class TasksModule {}
