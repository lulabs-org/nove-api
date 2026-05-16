/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-03 03:37:31
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-04-04 02:17:00
 * @FilePath: /lulab_backend/src/mail/mail.processor.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';
import { SendEmailDto } from './dto/send-email.dto';

@Processor('mail')
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<Partial<SendEmailDto>, any, string>): Promise<void> {
    try {
      if (job.name === 'sendMail') {
        if (!job.data?.to) {
          throw new Error('Email address (to) is required in job data');
        }
        this.logger.log(`📨 正在发送邮件给: ${job.data.to}`);
        const result = await this.mailService.sendEmail(
          job.data as SendEmailDto,
        );
        if (!result.success) {
          throw new Error(result.error ?? '邮件发送失败');
        }
        this.logger.log(
          `✅ 邮件发送完成: ${job.data.to}, MessageId: ${result.messageId}`,
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`邮件发送失败: ${errorMessage}`, errorStack);
      throw error; // Re-throw so the job is marked as failed
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`🎉 任务完成: ${job.id}`);
  }
}
