import { Injectable, Logger, Inject } from '@nestjs/common';
import { PeriodType } from '@prisma/client';
import { ConfigType } from '@nestjs/config';

import { LlmService } from '../../llm/llm.service';
import { ParticipantSummaryRepository } from '../repositories/participant-summary.repository';
import { SummaryRelationRepository } from '../repositories/summary-relation.repository';
import { getdayRange, getPeriodContext } from '../utils/period-time-range';
import { openaiConfig } from '../../configs/openai.config';
import { generatePrompt } from '@/common/utils';

@Injectable()
export class PeriodSummaryService {
  private readonly logger = new Logger(PeriodSummaryService.name);

  constructor(
    private readonly summaryRepo: ParticipantSummaryRepository,
    private readonly summaryRelationRepo: SummaryRelationRepository,
    private readonly llmService: LlmService,
    @Inject(openaiConfig.KEY)
    private readonly config: ConfigType<typeof openaiConfig>,
  ) { }

  /**
   * 触发并执行指定周期的总结任务。
   *
   * 该方法会根据给定的周期类型 (PeriodType) 计算目标时间范围，
   * 筛选出在该时间区间内有会议记录的所有活跃用户，
   * 并通过控制并发度（默认并发量 5）批量为这些用户生成聚合总结。
   *
   * @param periodType 目标总结周期类型 (如 WEEKLY, MONTHLY 等)
   * @param targetDate 目标日期，用于计算当前周期的起止时间范围，默认为当前时间
   * @returns 包含执行结果及时间戳的对象
   */
  async generateSummaries(
    periodType: PeriodType,
    targetDate: Date = new Date(),
  ): Promise<{ ok: boolean; at: string }> {
    this.logger.log(`开始执行任务: personal${periodType}MeetingSummary`);

    const ctx = getPeriodContext(periodType);
    if (!ctx) {
      this.logger.warn(`不支持或未知的周期类型: ${periodType}`);
      return this.result(false);
    }

    const { periodStart, periodEnd } = getdayRange(periodType, targetDate);
    if (!periodStart || !periodEnd) {
      this.logger.warn(`无法解析时间区间, 周期类型: ${periodType}`);
      return this.result(false);
    }

    // 1. 获取所有符合条件的参与总结记录
    const summaries = await this.summaryRepo.findActiveUserIds({
      periodStart,
      periodEnd,
      parentPeriodType: ctx.parent,
    });

    // 2. 提取唯一的平台用户 ID 列表
    const uniqueUserIds = [
      ...new Set(
        summaries.map((s) => s.platformUserId).filter(Boolean) as string[],
      ),
    ];

    if (!uniqueUserIds.length) {
      this.logger.warn('没有找到符合条件的记录, participantSummary的新增记录为空');
      return this.result(true);
    }

    this.logger.log(`需处理的用户数: ${uniqueUserIds.length}`);

    // 3. 分批并发处理每个用户的总结 (并发度 5)
    await this.runBatched(uniqueUserIds, 5, (userId) =>
      this.generateUserSummary(userId, periodType, targetDate).catch((err: unknown) =>
        this.logger.error(
          `处理用户 ${userId} 总结时失败`,
          err instanceof Error ? err.stack : String(err),
        ),
      ),
    );

    return this.result(true);
  }

  /**
   * 为单个用户生成特定周期的聚合会议总结。
   *
   * 工作流如下：
   * 1. 根据 periodType 确定上下文 (ctx)，包括依赖的下级周期类型 (ctx.parent) 和展示标签 (ctx.label)；
   *    若无对应上下文则直接跳过。
   * 2. 查询该用户在目标周期范围内已有的下级总结 (parentPeriodType = ctx.parent)；
   *    若结果为空则直接跳过。
   * 3. 将下级总结精简后作为输入，组装 Prompt 调用 LLM 生成本周期的聚合总结文本。
   * 4. 将聚合总结落库 (childSummary)，并批量建立其与各下级总结的关联记录 (SummaryRelation)。
   *
   * 注意：SummaryRelation 中 parentSummaryId 指下级总结（如 daily），
   *       childSummaryId 指本次新建的聚合总结（如 weekly）。
   *
   * @param platformUserId 第三方平台的用户唯一标识
   * @param periodType 当前要生成的周期类型 (如 WEEKLY、MONTHLY 等)
   * @param targetDate 目标日期，用于计算当前周期的起止时间范围
   */
  private async generateUserSummary(
    platformUserId: string,
    periodType: PeriodType,
    targetDate: Date,
  ) {
    const ctx = getPeriodContext(periodType);
    if (!ctx) return;

    const { periodStart, periodEnd } = getdayRange(periodType, targetDate);

    const userSummaries = await this.summaryRepo.findByUserAndPeriod({
      platformUserId,
      parentPeriodType: ctx.parent,
      periodStart,
      periodEnd,
    });

    if (userSummaries.length === 0) return;

    const userName = userSummaries[0]?.userName ?? '未知用户';
    this.logger.log(
      `获取到用户(${platformUserId})的参会议记录: ${userSummaries.length} 条`,
    );

    const leanSummaries = userSummaries.map((s) => ({
      userName: s.userName,
      partSummary: s.partSummary,
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
    }));

    const { systemPrompt, prompt } = generatePrompt('PERIOD_SUMMARY', {
      userName,
      ctxLabel: ctx.label,
      leanSummaries,
    });

    const reply = await this.llmService.createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ]);

    this.logger.log(`LLM聊天完成: ${reply?.slice(0, 200)}`);

    // 落库聚合总结 (childSummary)
    const childSummary = await this.summaryRepo.create({
      periodType,
      periodStart,
      periodEnd,
      userName,
      partSummary: reply || '',
      platformUserId,
      aiModel: this.config.model,
    });

    // 批量建立聚合总结 (childSummary) 与各下级总结 (userSummaries) 的关联记录
    await this.summaryRelationRepo.createMany(
      userSummaries.map((p) => ({
        parentSummaryId: p.id,
        childSummaryId: childSummary.id,
        parentPeriodType: ctx.parent,
        childPeriodType: periodType,
      })),
    );

    this.logger.log(
      `创建了 ${userSummaries.length} 条关联记录, 新总结 ID: ${childSummary.id}`,
    );
  }

  /** 构造统一格式的返回结果 */
  private result(ok: boolean): { ok: boolean; at: string } {
    return { ok, at: new Date().toISOString() };
  }

  /**
   * 将数组按 concurrency 分批，每批并发执行 fn，批次间顺序执行。
   *
   * @param items 待处理的元素列表
   * @param concurrency 每批并发数量
   * @param fn 每个元素的异步处理函数
   */
  private async runBatched<T>(
    items: T[],
    concurrency: number,
    fn: (item: T) => Promise<unknown>,
  ): Promise<void> {
    for (let i = 0; i < items.length; i += concurrency) {
      await Promise.all(items.slice(i, i + concurrency).map(fn));
    }
  }
}
