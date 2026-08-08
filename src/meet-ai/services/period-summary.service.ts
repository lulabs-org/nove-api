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
  ) {}

  /**
   * 触发并执行指定周期的总结任务。
   * 
   * 该方法会根据给定的周期类型 (PeriodType) 计算目标时间范围，
   * 筛选出在该时间区间内有会议记录的所有活跃用户，
   * 并通过控制并发度（默认并发量 5）批量为这些用户生成聚合总结。
   * 
   * @param periodType 目标总结周期类型 (如 WEEKLY, MONTHLY 等)
   * @returns 包含执行结果及时间戳的对象
   */
  async process(periodType: PeriodType): Promise<{ ok: boolean; at: string }> {
    this.logger.log(
      `开始执行任务: personal${periodType}MeetingSummary`,
      new Date().toISOString(),
    );

    const targetDate = new Date();
    const ctx = getPeriodContext(periodType);
    if (!ctx) {
      this.logger.warn(`不支持或未知的周期类型: ${periodType}`);
      return { ok: false, at: new Date().toISOString() };
    }

    const { periodStart, periodEnd } = getdayRange(periodType, targetDate);

    if (!periodStart || !periodEnd) {
      this.logger.warn(`无法解析时间区间, 周期类型: ${periodType}`);
      return { ok: false, at: new Date().toISOString() };
    }

    // 1. 获取所有符合条件的参与总结记录
    const summaries = await this.summaryRepo.findActiveUserIds({
      periodStart,
      periodEnd,
      parentPeriodType: ctx.parent,
    });

    // 2. 提取唯一的平台用户 ID 列表
    const uniqueUserIds = [...new Set(summaries.map(s => s.platformUserId).filter(Boolean) as string[])];

    if (!uniqueUserIds.length) {
      this.logger.warn('没有找到符合条件的记录, participantSummary的新增记录为空');
      return { ok: true, at: new Date().toISOString() };
    }

    this.logger.log(`需处理的用户数: ${uniqueUserIds.length}`);

    // 3. 遍历并分批处理每个用户的总结 (并发度控制为 5)
    for (let i = 0; i < uniqueUserIds.length; i += 5) {
      await Promise.all(
        uniqueUserIds.slice(i, i + 5).map(userId =>
          this.processUser(userId, periodType, targetDate)
            .catch(err => this.logger.error(`处理用户 ${userId} 总结时失败`, err.stack))
        )
      );
    }

    return { ok: true, at: new Date().toISOString() };
  }

  /**
   * 为单个用户生成特定周期的聚合会议总结。
   * 
   * 工作流如下：
   * 1. 获取目标用户在该周期内的所有子级总结数据 (如：周总结依赖日总结)。
   * 2. 将提取的子总结数据作为上下文，组装 Prompt 请求大模型 (LLM)。
   * 3. 将大模型生成的结果落库，作为新的父级总结。
   * 4. 建立父级总结与子级总结的层级关联关系 (SummaryRelation)。
   * 
   * @param platformUserId 第三方平台的用户唯一标识
   * @param periodType 当前要生成的周期类型 (如 WEEKLY, MONTHLY 等)
   * @param targetDate 目标日期，用于计算当前周期的起止时间
   */
  private async processUser(
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

    const { systemPrompt, prompt } = generatePrompt(
      'PERIOD_SUMMARY',
      {
        userName,
        ctxLabel: ctx.label,
        leanSummaries,
      },
    );

    const reply = await this.llmService.createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ]);

    this.logger.log(`LLM聊天完成: ${reply?.slice(0, 200)}`);

    // 保存主总结
    const parentSummary = await this.summaryRepo.create({
      periodType,
      periodStart,
      periodEnd,
      userName,
      partSummary: reply || '',
      platformUserId,
      aiModel: this.config.model,
    });

    // 关联子总结 (批量插入)
    await this.summaryRelationRepo.createMany(
      userSummaries.map((child) => ({
        parentSummaryId: parentSummary.id,
        childSummaryId: child.id,
        parentPeriodType: periodType,
        childPeriodType: ctx.parent,
      })),
    );

    this.logger.log(
      `创建了 ${userSummaries.length} 条关联记录, 父总结 ID: ${parentSummary.id}`,
    );
  }
}
