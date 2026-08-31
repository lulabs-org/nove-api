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
import { ConfigModule } from '@nestjs/config';
import { emailConfig } from '@/configs/email.config';
import { MailerService } from './services/mailer.service';
import { MailService } from './services/mail.service';
import { AuthMailService } from './services/auth-mail.service';
import { EmailBrandResolverService } from './services/email-brand-resolver.service';
import { MailController } from './mail.controller';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { MailProcessor } from './mail.processor';
import { SystemConfigModule } from '@/admin/system-config/system-config.module';

@Module({
  imports: [
    ConfigModule.forFeature(emailConfig),
    BullModule.registerQueue({
      name: 'mail', // 队列名称
    }),
    BullBoardModule.forFeature({
      name: 'mail',
      adapter: BullMQAdapter,
    }),
    SystemConfigModule,
  ],
  controllers: [MailController],
  providers: [
    MailerService,
    MailService,
    EmailBrandResolverService,
    AuthMailService,
    MailProcessor,
  ],
  exports: [MailService, AuthMailService, EmailBrandResolverService],
})
export class MailModule {}
