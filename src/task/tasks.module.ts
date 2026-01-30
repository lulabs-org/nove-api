/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-03 05:55:35
 * @LastEditors: Mingxuan 159552597+Luckymingxuan@users.noreply.github.com
 * @LastEditTime: 2026-01-29 18:39:01
 * @FilePath: \nove-api\src\task\tasks.module.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

// src/tasks/tasks.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TasksController } from './tasks.controller';
import { TasksService } from './service/tasks.service';
import { TaskProcessor } from './processors/task.processor';
import { PrismaService } from '../prisma/prisma.service';
import { OpenaiModule } from '../integrations/openai/openai.module';
import { PeriodSummary } from './service/period-summary.service';
import { PeriodSummaryTool } from './service/period-summary-tool';
import { PeriodSummaryRepository } from './repositories/period-summary.repository';
import { PeriodTimeRange } from './utils/period-time-range';

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
    PeriodTimeRange,
  ],
})
export class TasksModule {}
