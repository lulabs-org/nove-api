import { Injectable, Logger, Inject } from '@nestjs/common';
import { PeriodType } from '@prisma/client';
import { ConfigType } from '@nestjs/config';

import { LlmService } from '../../llm/llm.service';
import { ParticipantSummaryRepository } from '../repositories/participant-summary.repository';
import { SummaryRelationRepository } from '../repositories/summary-relation.repository';
import { PeriodTimeRange } from '../utils/period-time-range';
import { openaiConfig } from '../../configs/openai.config';

interface PeriodContext {
  parent: PeriodType;
  label: string;
}

const getPeriodContext = (periodType: PeriodType): PeriodContext | undefined => {
  const periodMap: Partial<Record<PeriodType, PeriodContext>> = {
    [PeriodType.YEARLY]: { parent: PeriodType.MONTHLY, label: '本年' },
    [PeriodType.QUARTERLY]: { parent: PeriodType.MONTHLY, label: '本季度' },
    [PeriodType.MONTHLY]: { parent: PeriodType.DAILY, label: '本月' },
    [PeriodType.WEEKLY]: { parent: PeriodType.DAILY, label: '本周' },
    [PeriodType.DAILY]: { parent: PeriodType.SINGLE, label: '本日' },
  };
  return periodMap[periodType];
};

@Injectable()
export class PeriodSummaryService {
  private readonly logger = new Logger(PeriodSummaryService.name);

  constructor(
    private readonly summaryRepo: ParticipantSummaryRepository,
    private readonly summaryRelationRepo: SummaryRelationRepository,
    private readonly periodTimeRange: PeriodTimeRange,
    private readonly llmService: LlmService,
    @Inject(openaiConfig.KEY)
    private readonly config: ConfigType<typeof openaiConfig>,
  ) {}

  /**
   * 处理总结任务
   */
  async process(periodType: PeriodType): Promise<{ ok: boolean; at: string }> {
    this.logger.log(
      `开始执行任务: personal${periodType}MeetingSummary`,
      new Date().toISOString(),
    );

    const ctx = getPeriodContext(periodType);
    if (!ctx) {
      this.logger.warn(`不支持或未知的周期类型: ${periodType}`);
      return { ok: false, at: new Date().toISOString() };
    }

    const { periodStart, periodEnd } =
      this.periodTimeRange.getdayRange(periodType);

    if (!periodStart || !periodEnd) {
      this.logger.warn(`无法解析时间区间, 周期类型: ${periodType}`);
      return { ok: false, at: new Date().toISOString() };
    }

    // 1. 获取所有符合条件的参与总结记录
    const summaries = await this.summaryRepo.findUserIdsByPeriod({
      periodStart,
      periodEnd,
      parentPeriodType: ctx.parent,
    });

    // 2. 提取唯一的平台用户 ID 列表
    const platformUserIds = summaries.map((s) => s.platformUserId).filter(Boolean) as string[];

    if (platformUserIds.length === 0) {
      this.logger.warn(
        '没有找到符合条件的记录, participantSummary的新增记录为空',
      );
      return { ok: true, at: new Date().toISOString() };
    }

    this.logger.log(`需处理的用户数: ${platformUserIds.length}`);

    // 3. 遍历并分批处理每个用户的总结 (并发度控制为 5)
    const chunkSize = 5;
    for (let i = 0; i < platformUserIds.length; i += chunkSize) {
      const chunk = platformUserIds.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map((platformUserId) =>
          this.processUser(platformUserId, periodType, ctx, periodStart, periodEnd)
            .catch((err) => {
              this.logger.error(`处理用户 ${platformUserId} 的会议总结时发生错误`, err.stack);
            })
        )
      );
    }

    return { ok: true, at: new Date().toISOString() };
  }

  /**
   * 处理单个用户的会议总结
   */
  private async processUser(
    platformUserId: string,
    periodType: PeriodType,
    ctx: PeriodContext,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const userSummaries = await this.summaryRepo.findPeriodSummariesByPlatformUserId({
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

    const { systemPrompt, prompt } = this.buildPrompt(userName, ctx, userSummaries);

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
        parentPeriodType: ctx.parent,
        childPeriodType: periodType,
      }))
    );

    this.logger.log(
      `创建了 ${userSummaries.length} 条关联记录, 父总结 ID: ${parentSummary.id}`,
    );
  }

  private buildPrompt(userName: string, ctx: PeriodContext, userSummaries: any[]) {
    const systemPrompt = `
      你是人工智能助手，需要总结用户"${userName}"${ctx.label} 的会议记录。
      字段说明：
      - userName: 参会人在 onstage会议的昵称
      - partSummary: 参会人 onstage会议的总结
      - periodStart: 会议总结的开始区间
      - periodEnd: 会议总结的结束区间

      切记以上只是字段解释，不是输出内容。
      你只需要根据用户输入，总结用户在会议中的活动，输出 markdown 格式的总结。
    `.trim();

    // 优化上下文大小：只传递必要字段，剔除无用的元数据
    const leanSummaries = userSummaries.map(s => ({
      userName: s.userName,
      partSummary: s.partSummary,
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
    }));
    const prompt = JSON.stringify(leanSummaries);
    return { systemPrompt, prompt };
  }
}
