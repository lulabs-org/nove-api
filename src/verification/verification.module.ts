/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-23 06:15:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-03 04:04:27
 * @FilePath: /lulab_backend/src/verification/verification.module.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */
import { Global, Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerificationRepository } from './repositories/verification.repository';
import { SmsModule } from '../sms/sms.module';
import { MailModule } from '@/mail/mail.module';
import { VerificationController } from './verification.controller';

@Global()
@Module({
  imports: [SmsModule, MailModule],
  controllers: [VerificationController],
  providers: [VerificationService, VerificationRepository],
  exports: [VerificationService],
})
export class VerificationModule {}
