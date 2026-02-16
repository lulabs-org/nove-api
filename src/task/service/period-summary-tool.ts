/*
 * @Author: Mingxuan 159552597+Luckymingxuan@users.noreply.github.com
 * @Date: 2026-01-03 09:40:30
 * @LastEditors: Mingxuan songmingxuan936@gmail.com
 * @LastEditTime: 2026-02-16 16:36:28
 * @FilePath: /nove-api/src/task/service/period-summary-tool.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { OpenaiService } from '../../integrations/openai/openai.service';
import { PeriodSummaryRepository } from '../repositories/period-summary.repository';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { PeriodType } from '@prisma/client';
import { PeriodTimeRange } from '../utils/period-time-range';

import { openaiConfig } from '../../configs/openai.config';
import { ConfigType } from '@nestjs/config';
import { log } from 'node:console';

@Injectable()
export class PeriodSummaryTool {
  private readonly logger = new Logger(PeriodSummaryTool.name);

  constructor(
    private readonly openaiService: OpenaiService,
    private readonly periodSummaryRepository: PeriodSummaryRepository,
    private readonly periodTimeRange: PeriodTimeRange,

    @Inject(openaiConfig.KEY)
    private readonly config: ConfigType<typeof openaiConfig>,
  ) {}

  /**
   * 获取所有符合条件的 participantSummary 记录，并按 userId 分组
   * @returns 分组数组，每个元素包含 userId 和对应 platformUserIds
   */
  async getGroupedPlatformUsers(
    periodType: PeriodType,
  ): Promise<string[] | null> {
    // 获取时间范围
    const { periodStart, periodEnd } =
      this.periodTimeRange.getdayRange(periodType);

    // 查询子总结的周期类型(这里先获取类型)
    const { parentPeriodType } = this.deriveParentPeriodType(periodType);
    if (!parentPeriodType) {
      this.logger.warn(
        `deriveParentPeriodType 返回了 undefined, 周期类型: ${periodType}`,
      );
      return [];
    }

    // 查所有participantSummary的记录，但只拿平台用户的 id 和 userId
    const summaries =
      await this.periodSummaryRepository.findAllMeetingSummaries({
        periodStart,
        periodEnd,
        parentPeriodType,
      });

    // 如果没有值，直接返回
    if (summaries.length === 0) {
      return null; // 如果没有值，返回 null
    }

    // 去重
    const seen = new Set<string>();
    // filter 会一条条遍历 summaries，如果 id 重复就不放入 uniqueSummaries，第一次出现的保留。
    return summaries
      .map((item) => item.platformUserId)
      .filter((id): id is string => {
        if (!id) return false; // 如果 platformUserId 为 null，直接过滤掉
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
  }

  /**
   * 处理单个用户的每日会议总结流程
   * - 获取该用户的会议记录
   * - 判断 realName（userId / platformUser）
   * - 调用 AI 生成总结
   * - 保存总结并创建关联
   * - 打印日志
   * @param group 单个用户分组信息，包含 userId 和 platformUserIds
   */
  async processOneUserSummary(platformUserId: string, periodType: PeriodType) {
    // 查找当前 platformUserId 对应的 participantSummary
    const summaries = await this.getSummariesByPlatformUserIds(
      periodType,
      platformUserId,
    );

    let userName: string = summaries[0]?.userName ?? '未知用户';

    this.logger.log(
      `获取到用户(${platformUserId})的参会议记录` +
        JSON.stringify(summaries, null, 2),
    );

    // 总结会议记录
    const reply = await this.generateSummary(
      userName,
      summaries,
      periodType,
      '', // 或者你之后自定义 prompt
    );
    this.logger.log(`OpenAI聊天完成: ${reply?.slice(0, 200)}`);

    this.logger.log(
      `当前用户(${platformUserId})的会议记录已完成:` +
        JSON.stringify(summaries, null, 2),
    );

    // 保存总结内容和关系至ParticipantSummary
    await this.saveSummaryWithRelations({
      userName,
      periodType,
      reply,
      platformUserId,
      summaries,
    });
  }

  /**
   * 获取某组 platformUserIds 对应的 participantSummary 记录
   * @param platformUserIds 平台用户 ID 数组
   * @returns 每条记录包含 id、partSummary、partName、startAt、endAt、username
   */
  async getSummariesByPlatformUserIds(
    periodType: PeriodType,
    platformUserId: string,
  ): Promise<
    {
      id: string;
      partSummary: string;
      userName: string;
      periodStart: Date | null;
      periodEnd: Date | null;
    }[]
  > {
    // deriveChildPeriodType 根据周期类型返回子周期类型
    const { parentPeriodType } = this.deriveParentPeriodType(periodType);
    if (!parentPeriodType) {
      this.logger.warn(
        `deriveParentPeriodType 返回了 undefined, 周期类型: ${periodType}`,
      );
      return [];
    }

    // 获取昨天的时间范围
    const { periodStart, periodEnd } =
      this.periodTimeRange.getdayRange(periodType);

    // 查找当前分组下所有 platformUserId 对应的 participantSummary
    return await this.periodSummaryRepository.findSummaryByPlatformUserId({
      platformUserId,
      parentPeriodType,
      periodStart,
      periodEnd,
    });
  }

  /**
   * 调用 OpenAI 生成每日会议总结
   * @param userName 用户真实姓名或昵称
   * @param summaries 当前用户当天的所有会议记录
   * @param prompt 系统提示词，可自定义
   * @returns AI 生成的总结文本
   */
  async generateSummary(
    userName: string,
    summaries: {
      id: string;
      partSummary: string;
      userName: string;
      periodStart: Date | null;
      periodEnd: Date | null;
    }[],
    periodType: PeriodType,
    prompt: string,
  ): Promise<string> {
    const question = JSON.stringify(summaries);

    let { periodTypeStr } = this.deriveParentPeriodType(periodType);
    if (!periodTypeStr) {
      this.logger.warn(
        `deriveParentPeriodType 返回了 undefined, 周期类型: ${periodType}`,
      );
      return '';
    }

    const systemPrompt = `
      ${prompt}
      你是人工智能助手，需要总结用户"${userName}"${periodTypeStr} 的会议记录。
      字段说明：
      - userName: 参会人在 onstage会议的昵称
      - partSummary: 参会人 onstage会议的总结
      - periodStart: 会议总结的开始区间
      - periodEnd: 会议总结的结束区间

      切记以上只是字段解释，不是输出内容。
      你只需要根据用户输入，总结用户在会议中的活动，输出 markdown 格式的总结。
      `.trim();

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: question },
    ];

    return this.openaiService.createChatCompletion(messages);
  }

  // deriveChildPeriodType 根据周期类型返回子周期类型
  deriveParentPeriodType(periodType: PeriodType): {
    parentPeriodType?: PeriodType;
    periodTypeStr?: string;
  } {
    let parentPeriodType: PeriodType | undefined;
    let periodTypeStr: string | undefined;

    switch (periodType) {
      case PeriodType.YEARLY:
        parentPeriodType = PeriodType.MONTHLY;
        periodTypeStr = '本年';
        break;
      case PeriodType.QUARTERLY:
        parentPeriodType = PeriodType.MONTHLY;
        periodTypeStr = '本季度';
        break;
      case PeriodType.MONTHLY:
        parentPeriodType = PeriodType.DAILY;
        periodTypeStr = '本月';
        break;
      case PeriodType.WEEKLY:
        parentPeriodType = PeriodType.DAILY;
        periodTypeStr = '本周';
        break;
      case PeriodType.DAILY:
        parentPeriodType = PeriodType.SINGLE;
        periodTypeStr = '本日';
        break;
      default:
        this.logger.warn(
          `deriveParentPeriodType 返回了 undefined, 周期类型: ${periodType}`,
        );
        parentPeriodType = undefined;
        periodTypeStr = undefined;
    }

    return {
      parentPeriodType,
      periodTypeStr,
    };
  }

  /**
   * 保存 AI 总结到 participantSummary，并创建 summaryRelation 关联
   * @param params 传入 realName、reply、userId、platformUserIds、summaries
   * @returns 保存结果对象，包含成功状态、parentSummary ID 和提示信息
   */
  async saveSummaryWithRelations(params: {
    userName: string;
    reply: string;
    platformUserId: string;
    periodType: PeriodType;
    summaries: { id: string }[];
  }) {
    const { userName, reply, platformUserId, periodType, summaries } = params;

    // 获取昨天是时间范围
    const { periodStart, periodEnd } =
      this.periodTimeRange.getdayRange(periodType);

    // deriveParentPeriodType 根据周期类型返回父周期类型
    const { parentPeriodType } = this.deriveParentPeriodType(periodType);
    if (!parentPeriodType) {
      this.logger.warn(
        `deriveParentPeriodType 返回了 undefined, 周期类型: ${periodType}`,
      );
      return [];
    }

    // 获取对话ai的模型信息
    const configModel = this.config.model;

    // 保存ai总结内容至ParticipantSummary
    const parentSummary =
      await this.periodSummaryRepository.createPeriodSummary({
        periodType: periodType,
        periodStart: periodStart,
        periodEnd: periodEnd,
        userName: userName,
        partSummary: reply,
        platformUserId,
        aiModel: configModel,
      });

    // 遍历 summaries，把每条记录的 id 作为 childSummaryId 创建 SummaryRelation
    for (const childSummary of summaries) {
      await this.periodSummaryRepository.createSummaryRelation({
        parentSummaryId: parentSummary.id, // parentSummary 已经定义
        childSummaryId: childSummary.id,
        parentPeriodType: parentPeriodType,
        childPeriodType: periodType,
      });
    }

    this.logger.log(
      `创建了 ${summaries.length} 条关联记录, 父总结 ID: ${parentSummary.id}`,
    );
  }
}
