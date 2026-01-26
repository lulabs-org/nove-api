/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-03 06:03:56
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-25 14:13:23
 * @FilePath: /nove_api/src/task/processors/task.processor.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import {
  Processor,
  WorkerHost,
  OnWorkerEvent,
  OnQueueEvent,
} from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PeriodSummary } from '../service/period-summary.service';
import { ScheduledTaskRepository } from '../repositories/scheduled-task.repository';

@Injectable()
@Processor('tasks')
export class TaskProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskProcessor.name);

  constructor(
    private readonly taskRepo: ScheduledTaskRepository,
    private readonly periodSummary: PeriodSummary,
  ) {
    super();
  }

  // 所有任务共用的处理器（可根据 name 分流到不同业务逻辑）
  override async process(
    job: Job<Record<string, unknown>, unknown, string>,
  ): Promise<unknown> {
    // 🔹 修改日志，显示 originalName
    const taskName = job.data.originalName ?? job.name; // 如果没有 originalName 就 fallback
    this.logger.debug(
      `Processing job name=${JSON.stringify(taskName)} id=${job.id}`,
    );

    // —— 在这里编写你真实的业务逻辑 ——
    // 举例：调用第三方 API、发送邮件、生成报表等

    // TODO: 示例任务实现
    // 根据 job.name 或 payload.type 分流到不同的业务逻辑
    switch (
      taskName //  job.data.originalName 匹配，而不是 job.name
    ) {
      case 'sendEmail':
        // TODO: 调用邮件服务发送邮件
        // await this.emailService.sendEmail(job.data.to, job.data.subject, job.data.body);
        break;

      case 'syncData':
        // TODO: 同步数据到第三方系统
        // await this.dataSyncService.sync(job.data.table, job.data.filters);
        break;

      case 'generateReport':
        // TODO: 生成报表并上传到云存储
        // const report = await this.reportService.generate(job.data.reportType, job.data.dateRange);
        // await this.fileService.upload(report, job.data.destination);
        break;

      case 'processMeetingRecording':
        // TODO: 处理会议录制文件
        // await this.meetingService.processRecording(job.data.meetingId, job.data.recordingUrl);
        break;

      case 'cleanupExpiredData':
        // TODO: 清理过期数据
        // await this.cleanupService.removeExpiredData(job.data.retentionDays);
        break;

      case 'personalDailyMeetingSummary': {
        // 周期性使用方法：
        // {
        //   "name": "helloWorld",
        //   "cron": "* * * * * *",
        //   "payload": {
        //     "originalName": "helloWorld"
        //   }
        // }

        return await this.periodSummary.processDailySummary();
      }

      // case 'openaiChat': {
      //   const payload = (job.data as any).payload ?? {};
      //   const question: string = payload.question ?? '你好';
      //   const systemPrompt: string = payload.systemPrompt ?? '你是人工智能助手';
      //   const messages = [
      //     { role: 'system' as const, content: systemPrompt },
      //     { role: 'user' as const, content: question },
      //   ];
      //   const reply = await this.openaiService.createChatCompletion(messages);
      //   this.logger.log(`OpenAI聊天完成: ${reply?.slice(0, 200)}`);
      //   return { reply };
      // }

      default:
        this.logger.warn(`Unknown job type: ${JSON.stringify(taskName)}`);
    }

    return { ok: true, at: new Date().toISOString() };
  }

  @OnWorkerEvent('active')
  async onActive(job: Job): Promise<void> {
    await this.taskRepo
      .updateStatusToRunning(String(job.id))
      .catch(() => undefined);
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job, result: unknown): Promise<void> {
    this.logger.debug(`Job ${job.id} completed: ${JSON.stringify(result)}`);
    await this.taskRepo
      .updateStatusToCompleted(String(job.id))
      .catch(() => undefined);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, err: Error): Promise<void> {
    this.logger.error(`Job ${job.id} failed: ${err.message}`);
    await this.taskRepo
      .updateStatusToFailed(String(job.id), err.message)
      .catch(() => undefined);
  }

  @OnQueueEvent('error')
  onQueueError(err: Error): void {
    this.logger.error(`Queue error: ${err.message}`);
  }
}
