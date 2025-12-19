/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-03 06:03:56
 * @LastEditors: Mingxuan 159552597+Luckymingxuan@users.noreply.github.com
 * @LastEditTime: 2025-12-19 16:05:29
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
import { OpenaiService } from '../integrations/openai/openai.service';

@Injectable()
@Processor('tasks')
export class TaskProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openaiService: OpenaiService,
  ) {
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
        // 周期性使用方法：
        // {
        //   "name": "helloWorld",
        //   "cron": "* * * * * *",
        //   "payload": {
        //     "originalName": "helloWorld"
        //   }
        // }

        console.log(
          '开始执行任务: personalDailyMeetingSummary',
          new Date().toISOString(),
        );

        // 查所有participantSummary的记录，但只拿平台用户的 id 和 userId
        const summaries =
          (await this.prisma.participantSummary.findMany({
            where: {
              platformUserId: { not: null }, // 平台用户不为空
              periodType: 'SINGLE', // 仅单次会议
            },
            select: {
              platformUser: {
                select: {
                  id: true,
                  userId: true,
                },
              },
            },
          })) ?? []; // 如果返回 null/undefined，默认是空数组

        // 如果没有值，直接返回
        if (summaries.length === 0) {
          console.log(
            '没有找到符合条件的记录, participantSummary的新增记录为空',
          );
          return { ok: true, at: new Date().toISOString() }; // 或者 return null / throw Error，根据你的需求
        }

        // 去重
        const seen = new Set<string>();
        // filter 会一条条遍历 summaries，如果 id 重复就不放入 uniqueSummaries，第一次出现的保留。
        const uniqueSummaries = summaries.filter((item) => {
          const id = item.platformUser?.id;
          if (!id) return false; // 如果 platformUser 或 id 为 null，直接过滤掉
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });

        // console.log(uniqueSummaries);

        // 按 userId 分组，把相同 userId 的 platformUser.id 收集到同一组，userId 为 null 也单独分组
        const groupedMap = new Map<
          string | null,
          { userId: string | null; platformUserIds: string[] }
        >();

        for (const item of uniqueSummaries) {
          const userId = item.platformUser?.userId ?? null; // 取 userId，null 也作为 key
          if (!groupedMap.has(userId)) {
            groupedMap.set(userId, { userId, platformUserIds: [] }); // 初始化分组(第一个 userId 是检索用的key)
          }
          groupedMap.get(userId)!.platformUserIds.push(item.platformUser!.id); // 添加 platformUser.id
        }

        // 转成数组方便使用 (Map 是数据结构，不方便直接当作普通数组使用)
        const data = Array.from(groupedMap.values());

        // 打印分组结果
        console.log(
          '在participantSummary表检索到以下用户:\n' +
            JSON.stringify(data, null, 2),
        ); // 第二个参数 null 表示不格式化，第三个参数 2 表示缩进 2 个空格

        console.log('开始依次总结每个用户的会议记录');

        for (let i = 0; i < data.length; i++) {
          const group = data[i]; // 当前分组对象 { userId, platformUserIds }
          const { userId, platformUserIds } = group;

          // 查找当前分组下所有 platformUserId 对应的 participantSummary
          const summaries = await this.prisma.participantSummary.findMany({
            where: {
              platformUserId: { in: platformUserIds }, // 当前分组的所有 platformUserId
              periodType: 'SINGLE', // 仅单次会议
            },
            select: {
              participantSummary: true, // 会议总结
              meetParticipant: true, // 参会人信息
              platformUser: {
                select: {
                  user: {
                    select: {
                      username: true, // 通过平台用户检索到真实user的用户名
                    },
                  },
                },
              },
            },
          });

          console.log(JSON.stringify(summaries, null, 2));

          console.log(`当前用户${userId}的会议记录已总结`);

          // 等待 5 秒
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }

        return { ok: true, at: new Date().toISOString() };
      }

      case 'openaiChat': {
        const payload = (job.data as any).payload ?? {};
        const question: string = payload.question ?? '你好';
        const systemPrompt: string = payload.systemPrompt ?? '你是人工智能助手';
        const messages = [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: question },
        ];
        const reply = await this.openaiService.createChatCompletion(messages);
        this.logger.log(`OpenAI聊天完成: ${reply?.slice(0, 200)}`);
        return { reply };
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
