/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-03 05:55:35
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-26 15:04:47
 * @FilePath: /nove_api/src/task/tasks.module.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TasksController } from './tasks.controller';
import { TasksService } from './service/tasks.service';
import { TaskProcessor } from './processors/task.processor';
import { PrismaService } from '../prisma/prisma.service';
import { OpenaiModule } from '../integrations/openai/openai.module';
import { PeriodSummary } from './service/period-summary.service';
import { PeriodSummaryTool } from './service/period-summary-tool';
import {
  PeriodSummaryRepository,
  ScheduledTaskRepository,
} from './repositories';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'tasks', // 队列名
    }),
    OpenaiModule,
  ],
  controllers: [TasksController],
  providers: [
    TasksService,
    TaskProcessor,
    PrismaService,
    PeriodSummary,
    PeriodSummaryTool,
    PeriodSummaryRepository,
    ScheduledTaskRepository,
  ],
})
export class TasksModule {}
