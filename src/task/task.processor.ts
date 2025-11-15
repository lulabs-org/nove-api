/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-03 06:03:56
 * @LastEditors: Mingxuan 159552597+Luckymingxuan@users.noreply.github.com
 * @LastEditTime: 2025-11-15 09:49:41
 * @FilePath: \lulab_backend\src\task\task.processor.ts
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
import { PrismaService } from '../prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';

@Injectable()
@Processor('tasks')
export class TaskProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // 所有任务共用的处理器（可根据 name 分流到不同业务逻辑）
  override async process(
    job: Job<Record<string, unknown>, unknown, string>,
  ): Promise<unknown> {
    // 🔹 修改日志，显示 originalName
    const taskName = job.data.originalName ?? job.name; // 如果没有 originalName 就 fallback
    this.logger.debug(`Processing job name=${taskName} id=${job.id}`);

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
        console.log(
          '开始执行任务: personalDailyMeetingSummary',
          new Date().toISOString(),
        );

        // 当前进度（pageToken = user.id）
        let pageToken = (job.data as any).payload?.pageToken ?? null;

        while (true) {
          // 1. 找到下一个真实用户
          const nextUser = await this.prisma.user.findFirst({
            where: pageToken ? { id: { gt: pageToken } } : undefined,
            orderBy: { id: 'asc' },
            include: {
              platformUsers: {
                where: { isActive: true },
                include: {
                  participantSummaries: {
                    where: { deletedAt: null },
                    orderBy: { meetStartTime: 'desc' },
                  },
                },
              },
            },
          });

          // 没有用户了 → 任务结束
          if (!nextUser) {
            console.log('全部用户处理完毕！', new Date().toISOString());
            return {
              nextPageToken: null,
              done: true,
            };
          }

          console.log(
            `处理用户: ${nextUser.id} (username=${nextUser.username})`,
          );

          // 2. 遍历该用户所有平台账户
          for (const account of nextUser.platformUsers) {
            console.log(
              `  处理账号: ${account.id} (platformUserId=${account.platformUserId}, 平台=${account.platform})`,
            );

            // 3. 打印该账户的所有 ParticipantSummary
            for (const summary of account.participantSummaries) {
              console.log(`
                ====== Participant Summary ======
                recordFileId: ${summary.recordFileId}
                meetStartTime: ${summary.meetStartTime}
                meetParticipant: ${summary.meetParticipant}

                个人总结:
                ${summary.participantSummary}

                会议总结:
                ${summary.meetingSummary}
                ==================================
              `);
            }

            console.log(
              `  该账号共有 ${account.participantSummaries.length} 条会议总结`,
            );
          }

          // 保存当前用户 id 为下次 pageToken
          pageToken = nextUser.id;

          console.log('等待 5 秒后处理下一个用户...');
          await new Promise((res) => setTimeout(res, 5000));
        }
      }

      default:
        this.logger.warn(`Unknown job type: ${taskName}`);
    }

    // 模拟：sleep 500ms
    await new Promise((r) => setTimeout(r, 500));

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
    this.logger.debug(`Job ${job.id} completed: ${JSON.stringify(result)}`);
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
