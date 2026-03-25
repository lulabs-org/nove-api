/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-03 03:37:31
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-03 04:42:44
 * @FilePath: /lulab_backend/src/mail/mail.processor.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { MailService } from './mail.service';

@Injectable()
@Processor('mail')
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(
    job: Job<{ email: string; subject?: string; text?: string; html?: string; [key: string]: any }, any, string>,
  ): Promise<void> {
    try {
      if (job.name === 'sendMail') {
        if (!job.data?.email) {
          throw new Error('Email address is required in job data');
        }

        this.logger.log(`📨 正在发送邮件给: ${job.data.email}`);

        // 使用 MailService 发送邮件
        await this.mailService.sendSimpleEmail({
          to: job.data.email,
          subject: job.data.subject || '通知邮件',
          text: job.data.text,
          html: job.data.html,
        });

        this.logger.log(`✅ 邮件发送完成: ${job.data.email}`);
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
