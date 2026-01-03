/*
 * @Author: Mingxuan 159552597+Luckymingxuan@users.noreply.github.com
 * @Date: 2025-12-25 20:04:17
 * @LastEditors: Mingxuan 159552597+Luckymingxuan@users.noreply.github.com
 * @LastEditTime: 2026-01-03 09:46:39
 * @FilePath: \lulab_backend\src\task\service\period-summary.service.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import type { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenaiService } from '../../integrations/openai/openai.service';
import { PeriodSummaryTool } from './period-summary-tool';

export class PeriodSummary {
  private helper: PeriodSummaryTool;

  // 让构造器导入prisma和openaiService
  constructor(
    private readonly prisma: PrismaService,
    private readonly openaiService: OpenaiService,
  ) {
    // 初始化 PeriodSummaryTool，传入依赖
    this.helper = new PeriodSummaryTool(prisma, openaiService);
  }

  /**
   * 处理每日会议总结任务（批量处理所有用户）
   * - 调用 getGroupedPlatformUsers 获取所有分组
   * - 遍历每个分组，调用 processOneUserDailySummary 处理
   * - 每处理完一个用户，等待 5 秒以防压力过大
   * @param job BullMQ Job 对象（可用于任务追踪）
   * @returns 处理完成状态及时间戳
   */
  async processDailySummary(job: Job): Promise<{ ok: boolean; at: string }> {
    console.log(
      '开始执行任务: personalDailyMeetingSummary',
      new Date().toISOString(),
    );

    // 调用 getGroupedPlatformUsers 方法获取分组结果
    const data = await this.getGroupedPlatformUsers();

    // 如果没有值，直接返回
    if (data.length === 0) {
      console.log('没有找到符合条件的记录, participantSummary的新增记录为空');
      return { ok: true, at: new Date().toISOString() }; // 或者 return null / throw Error，根据你的需求
    }

    // 打印分组结果
    console.log(
      '在participantSummary表检索到以下用户:\n' + JSON.stringify(data, null, 2),
    ); // 第二个参数 null 表示不格式化，第三个参数 2 表示缩进 2 个空格

    console.log('开始依次总结每个用户的会议记录');

    // 遍历每个分组，处理一个用户的会议记录
    for (const group of data) {
      await this.processOneUserDailySummary(group);

      // 等待 5 秒
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    return { ok: true, at: new Date().toISOString() };
  }

  // 未来可以添加其他方法
  // async processWeeklySummary(job: Job) { ... }
  // async processMonthlySummary(job: Job) { ... }
}
