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
import { HttpModule } from '@nestjs/axios';
import { TasksRepository } from './repositories/tasks.repository';

import { ConfigModule } from '@nestjs/config';
import { openaiConfig } from '../configs/openai.config';
import { TASK_QUEUE_NAME } from './task.constants';
import { TaskHandlerRegistry } from './handlers/task-handler.registry';
import { HttpTaskHandler } from './handlers/http.handler';

@Module({
  imports: [
    BullModule.registerQueue({
      name: TASK_QUEUE_NAME, // 队列名
    }),
    BullBoardModule.forFeature({
      name: TASK_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
    OpenaiModule,
    ConfigModule.forFeature(openaiConfig),
    HttpModule,
  ],
  controllers: [TasksController],
  providers: [
    TasksService,
    TaskProcessor,
    TasksRepository,
    PrismaService,
    TaskHandlerRegistry,
    HttpTaskHandler,
  ],
})
export class TasksModule {}
