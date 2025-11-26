/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-03 05:55:35
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-03 06:01:56
 * @FilePath: /lulab_backend/src/task/tasks.module.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

// src/tasks/tasks.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskProcessor } from './task.processor';
import { PrismaService } from '../prisma/prisma.service';
import { OpenaiModule } from '../integrations/openai/openai.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'tasks', // 队列名
    }),
    OpenaiModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskProcessor, PrismaService],
})
export class TasksModule {}
