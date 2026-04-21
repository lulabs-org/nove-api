/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-03 06:03:56
 * @LastEditors: Mingxuan songmingxuan936@gmail.com
 * @LastEditTime: 2026-02-16 16:47:30
 * @FilePath: /nove-api/src/task/processors/task.processor.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

// src/tasks/task.processor.ts
import {
  Processor,
  WorkerHost,
  OnWorkerEvent,
  OnQueueEvent,
} from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { TaskStatus, PeriodType, ProcessingStatus } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { PeriodSummary } from '../service/period-summary.service';

// 任务队列中 Job 的 payload 接口定义
interface JobPayload {
  originalName?: string;
  periodType?: PeriodType;
}

// 邮件任务 payload 接口
interface SendEmailPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

// 会议录制处理 payload 接口
interface ProcessMeetingRecordingPayload {
  meetingId: string;
  recordingUrl?: string;
}

// 清理过期数据 payload 接口
interface CleanupExpiredDataPayload {
  retentionDays?: number;
  batchSize?: number;
}

@Injectable()
@Processor('tasks')
export class TaskProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly periodSummary: PeriodSummary,
    @InjectQueue('mail') private readonly mailQueue: Queue,
  ) {
    super();
  }

  // 所有任务共用的处理器（可根据 name 分流到不同业务逻辑）
  override async process(
    job: Job<Record<string, unknown>, unknown, string>,
  ): Promise<unknown> {
    // 🔹 修改日志，显示 originalName
    const taskName = job.data.originalName ?? job.name; // 如果没有 originalName 就 fallback
    this.logger.log(
      `Processing job name=${JSON.stringify(taskName)} id=${job.id}`,
    );

    // —— 在这里编写你真实的业务逻辑 ——
    // 举例：调用第三方 API、发送邮件、生成报表等

    // TODO: 示例任务实现
    // 根据 job.name 或 payload.type 分流到不同的业务逻辑
    switch (
      taskName //  job.data.originalName 匹配，而不是 job.name
    ) {
      case 'sendEmail': {
        // 实现邮件发送任务
        const emailPayload = job.data as unknown as SendEmailPayload;
        if (!emailPayload.to || !emailPayload.subject) {
          this.logger.warn(
            `SendEmail task missing required fields: ${JSON.stringify(emailPayload)}`,
          );
          return {
            ok: false,
            message: 'Missing required fields: to, subject',
          };
        }

        try {
          // 将邮件任务添加到邮件队列
          const mailJob = await this.mailQueue.add(
            'sendMail',
            {
              email: emailPayload.to,
              subject: emailPayload.subject,
              text: emailPayload.text,
              html: emailPayload.html,
              from: emailPayload.from,
            },
            {
              removeOnComplete: { age: 3600, count: 1000 },
              removeOnFail: { age: 24 * 3600, count: 1000 },
            },
          );

          this.logger.log(
            `Email job queued: ${mailJob.id} for ${emailPayload.to}`,
          );
          return {
            ok: true,
            message: `Email queued with jobId: ${mailJob.id}`,
            recipient: emailPayload.to,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to queue email job: ${errorMessage}`,
            error instanceof Error ? error.stack : undefined,
          );
          throw error;
        }
      }

      case 'syncData': {
        // 实现数据同步任务
        const { table, filters, targetSystem } = job.data as {
          table?: string;
          filters?: Record<string, unknown>;
          targetSystem?: string;
        };

        this.logger.log(
          `SyncData task: table=${table}, targetSystem=${targetSystem}`,
        );

        // 记录同步任务执行
        return {
          ok: true,
          message: 'Data sync task executed',
          details: {
            table: table || 'unknown',
            targetSystem: targetSystem || 'unknown',
            filters: filters || {},
            timestamp: new Date().toISOString(),
          },
        };
      }

      case 'generateReport': {
        // 实现报表生成任务
        const { reportType, dateRange, destination } = job.data as {
          reportType?: string;
          dateRange?: { start: string; end: string };
          destination?: string;
        };

        this.logger.log(
          `GenerateReport task: type=${reportType}, destination=${destination}`,
        );

        // 记录报表生成任务执行
        return {
          ok: true,
          message: 'Report generation task executed',
          details: {
            reportType: reportType || 'unknown',
            dateRange: dateRange || {},
            destination: destination || 'default',
            timestamp: new Date().toISOString(),
          },
        };
      }

      case 'processMeetingRecording': {
        // 实现会议录制文件处理任务
        const payload = job.data as unknown as ProcessMeetingRecordingPayload;

        if (!payload.meetingId) {
          this.logger.warn(
            'ProcessMeetingRecording task missing meetingId',
          );
          return {
            ok: false,
            message: 'Missing required field: meetingId',
          };
        }

        try {
          // 更新会议处理状态为处理中
          await this.prisma.meeting.update({
            where: { id: payload.meetingId },
            data: {
              processingStatus: ProcessingStatus.PROCESSING,
            },
          });

          this.logger.log(
            `Started processing meeting recording: ${payload.meetingId}`,
          );

          // 模拟处理完成（实际项目中这里应该调用转录服务等）
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // 更新会议处理状态为已完成
          await this.prisma.meeting.update({
            where: { id: payload.meetingId },
            data: {
              processingStatus: ProcessingStatus.COMPLETED,
            },
          });

          this.logger.log(
            `Completed processing meeting recording: ${payload.meetingId}`,
          );

          return {
            ok: true,
            message: 'Meeting recording processed successfully',
            meetingId: payload.meetingId,
            recordingUrl: payload.recordingUrl,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to process meeting recording: ${errorMessage}`,
            error instanceof Error ? error.stack : undefined,
          );

          // 更新会议处理状态为失败
          await this.prisma.meeting
            .update({
              where: { id: payload.meetingId },
              data: {
                processingStatus: ProcessingStatus.FAILED,
              },
            })
            .catch(() => undefined);

          throw error;
        }
      }

      case 'cleanupExpiredData': {
        // 实现过期数据清理任务
        const payload = job.data as unknown as CleanupExpiredDataPayload;
        const retentionDays = payload.retentionDays ?? 90;
        const batchSize = payload.batchSize ?? 100;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        this.logger.log(
          `CleanupExpiredData task: retentionDays=${retentionDays}, cutoffDate=${cutoffDate.toISOString()}`,
        );

        try {
          // 清理过期的已删除会议记录
          const deletedMeetings = await this.prisma.meeting.deleteMany({
            where: {
              deletedAt: {
                lt: cutoffDate,
              },
            },
          });

          // 清理过期的已完成任务记录
          const deletedTasks = await this.prisma.scheduledTask.deleteMany({
            where: {
              status: TaskStatus.COMPLETED,
              updatedAt: {
                lt: cutoffDate,
              },
            },
          });

          this.logger.log(
            `Cleanup completed: ${deletedMeetings.count} meetings, ${deletedTasks.count} tasks deleted`,
          );

          return {
            ok: true,
            message: 'Expired data cleanup completed',
            details: {
              retentionDays,
              cutoffDate: cutoffDate.toISOString(),
              deletedMeetings: deletedMeetings.count,
              deletedTasks: deletedTasks.count,
            },
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to cleanup expired data: ${errorMessage}`,
            error instanceof Error ? error.stack : undefined,
          );
          throw error;
        }
      }

      case 'personalMeetingSummary': {
        // 周期性使用方法(默认时区是Asia/Shanghai)：
        // {
        //   "name": "personalMeetingSummary",
        //   "cron": "0 * * * * *",
        //   "payload": {
        //     "originalName": "personalMeetingSummary",
        //     "periodType": "DAILY"
        //   }
        // }

        // 使用方法二，添加指定时区
        // {
        //   "name": "personalMeetingSummary",
        //   "cron": "0 0 3 * * *",
        //   "timezone": "Asia/Shanghai",
        //   "payload": {
        //     "originalName": "personalMeetingSummary",
        //     "periodType": "DAILY"
        //   }
        // }

        // SINGLE // 单次会议
        // DAILY // 每日
        // WEEKLY // 每周
        // MONTHLY // 每月
        // QUARTERLY // 每季度
        // YEARLY // 每年

        const jobData = job.data as unknown as JobPayload;
        const periodType = jobData.periodType;

        if (!periodType) {
          this.logger.warn('periodType 未提供，任务跳过执行');
          return { ok: false, message: 'periodType is required' };
        }

        return await this.periodSummary.processSummary(periodType);
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
    await this.prisma.scheduledTask
      .updateMany({
        where: { jobId: String(job.id) },
        data: { status: TaskStatus.RUNNING },
      })
      .catch(() => undefined);
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job, result: unknown): Promise<void> {
    this.logger.log(`Job ${job.id} completed: ${JSON.stringify(result)}`);
    await this.prisma.scheduledTask
      .updateMany({
        where: { jobId: String(job.id) },
        data: { status: TaskStatus.COMPLETED, lastError: null },
      })
      .catch(() => undefined);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, err: Error): Promise<void> {
    this.logger.error(`Job ${job.id} failed: ${err.message}`);
    await this.prisma.scheduledTask
      .updateMany({
        where: { jobId: String(job.id) },
        data: { status: TaskStatus.FAILED, lastError: err.message },
      })
      .catch(() => undefined);
  }

  @OnQueueEvent('error')
  onQueueError(err: Error): void {
    this.logger.error(`Queue error: ${err.message}`);
  }
}
