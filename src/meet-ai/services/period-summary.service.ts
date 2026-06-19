import { Injectable, Logger, Inject } from '@nestjs/common';
import { PeriodType } from '@prisma/client';
import { ConfigType } from '@nestjs/config';

import { OpenaiService } from '../../integrations/openai/openai.service';
import { PeriodSummaryRepository } from '../repositories/period-summary.repository';
import { PeriodTimeRange } from '../utils/period-time-range';
import { openaiConfig } from '../../configs/openai.config';

@Injectable()
export class PeriodSummaryService {
  private readonly logger = new Logger(PeriodSummaryService.name);

  constructor(
    private readonly summaryRepo: PeriodSummaryRepository,
    private readonly periodTimeRange: PeriodTimeRange,
    private readonly openaiService: OpenaiService,
    @Inject(openaiConfig.KEY)
    private readonly config: ConfigType<typeof openaiConfig>,
  ) {}

  /**
   * 获取周期配置上下文
   */
  private getContext(periodType: PeriodType) {
    const periodMap: Partial<
      Record<PeriodType, { parent: PeriodType; label: string }>
    > = {
      [PeriodType.YEARLY]: { parent: PeriodType.MONTHLY, label: '本年' },
      [PeriodType.QUARTERLY]: { parent: PeriodType.MONTHLY, label: '本季度' },
      [PeriodType.MONTHLY]: { parent: PeriodType.DAILY, label: '本月' },
      [PeriodType.WEEKLY]: { parent: PeriodType.DAILY, label: '本周' },
      [PeriodType.DAILY]: { parent: PeriodType.SINGLE, label: '本日' },
    };
    return periodMap[periodType];
  }

  /**
   * 处理总结任务
   */
  async process(periodType: PeriodType): Promise<{ ok: boolean; at: string }> {
    this.logger.log(
      `开始执行任务: personal${periodType}MeetingSummary`,
      new Date().toISOString(),
    );

    const ctx = this.getContext(periodType);
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
    const summaries = await this.summaryRepo.findMany({
      periodStart,
      periodEnd,
      parentPeriodType: ctx.parent,
    });

    // 2. 提取唯一的平台用户 ID 列表
    const platformUserIds = [
      ...new Set(summaries.map((s) => s.platformUserId).filter(Boolean)),
    ] as string[];

    if (platformUserIds.length === 0) {
      this.logger.warn(
        '没有找到符合条件的记录, participantSummary的新增记录为空',
      );
      return { ok: true, at: new Date().toISOString() };
    }

    this.logger.log(`需处理的用户数: ${platformUserIds.length}`);

    // 3. 遍历并处理每个用户的总结
    for (const platformUserId of platformUserIds) {
      await this.processUser(
        platformUserId,
        periodType,
        ctx,
        periodStart,
        periodEnd,
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
    ctx: { parent: PeriodType; label: string },
    periodStart: Date,
    periodEnd: Date,
  ) {
    const userSummaries = await this.summaryRepo.findByPlatformUserId({
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

    // AI 总结
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

    const reply = await this.openaiService.createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(userSummaries) },
    ]);

    this.logger.log(`OpenAI聊天完成: ${reply?.slice(0, 200)}`);

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

    // 关联子总结
    for (const child of userSummaries) {
      await this.summaryRepo.createRelation({
        parentSummaryId: parentSummary.id,
        childSummaryId: child.id,
        parentPeriodType: ctx.parent,
        childPeriodType: periodType,
      });
    }

    this.logger.log(
      `创建了 ${userSummaries.length} 条关联记录, 父总结 ID: ${parentSummary.id}`,
    );
  }
}
