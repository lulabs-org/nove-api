/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-11-22 23:46:35
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-11-23 18:35:38
 * @FilePath: /lulab_backend/src/lark-meeting/lark-meeting.module.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Module } from '@nestjs/common';
import { LarkWebhookController } from './controllers/webhook.controller';
import { LarkEventWsService, LarkMeetingService } from './services';
import { LarkModule } from '../integrations/lark/lark.module';
import { LarkEventProcessor } from './queue/lark-event.processor';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { SystemConfigModule } from '@/admin/system-config/system-config.module';
import { MeetingModule } from '@/meeting/meeting.module';

@Module({
  imports: [
    LarkModule,
    SystemConfigModule,
    MeetingModule,
    BullModule.registerQueue({ name: 'lark-events' }),
    BullBoardModule.forFeature({
      name: 'lark-events',
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [LarkWebhookController],
  providers: [LarkEventWsService, LarkMeetingService, LarkEventProcessor],
  exports: [LarkMeetingService],
})
export class LarkMeetingModule {}
