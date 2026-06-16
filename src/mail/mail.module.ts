/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-23 06:15:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-03 03:48:00
 * @FilePath: /lulab_backend/src/mail/mail.module.ts
 * @Description: 邮件模块
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Module } from '@nestjs/common';
import { MailerModule } from '../integrations/email';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { MailProcessor } from './mail.processor';

@Module({
  imports: [
    MailerModule,
    BullModule.registerQueue({
      name: 'mail', // 队列名称
    }),
    BullBoardModule.forFeature({
      name: 'mail',
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [MailController],
  providers: [MailService, MailProcessor], // 注册MailProcessor
  exports: [MailService], // 导出服务以便其他模块使用
})
export class MailModule {}
