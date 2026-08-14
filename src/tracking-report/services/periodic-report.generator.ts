import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  GenerationMethod,
  TrackingCadence,
  TrackingReportType,
} from '@prisma/client';
import { generatePrompt } from '@/common/utils';
import { openaiConfig } from '@/configs/openai.config';
import { LlmService } from '@/llm/llm.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RecordingParticipantSummaryRepository } from '@/meeting/repositories/participant-summary.repository';
import { TrackingReportRepository } from '../repositories/tracking-report.repository';
import { TrackingReportService } from './tracking-report.service';
import { TriggerSummaryDto } from '../dto/tracking-report.dto';
import { getdayRange, getPeriodContext } from '../utils/period-time-range';
import type { UserPair } from '../queue/report-generation.processor';

type Source = {
  id: string;
  content: string;
  userName: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  subjectUserId: string | null;
  platformUserId: string | null;
  kind: 'recording' | 'report';
};

export type GenerateProgressEvent =
  | { type: 'start'; totalUsers: number }
  | { type: 'success'; platformUserId: string | null }
  | { type: 'failure'; platformUserId: string | null; error: string };

export type GenerateProgressCallback = (
  event: GenerateProgressEvent,
) => void | Promise<void>;

@Injectable()
export class PeriodicReportGenerator {
  private readonly logger = new Logger(PeriodicReportGenerator.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportRepo: TrackingReportRepository,
    private readonly summaryRepo: RecordingParticipantSummaryRepository,
    private readonly reportService: TrackingReportService,
    private readonly llmService: LlmService,
    @Inject(openaiConfig.KEY)
    private readonly config: ConfigType<typeof openaiConfig>,
  ) {}

  /**
   * 带逐用户进度回调的周期性总结生成（供 BullMQ processor 调用）
   * 单个用户失败不影响其他用户，失败信息通过 onProgress 回传。
   *
   * @param dto - 触发参数
   * @param userPairs - 双向解析后的用户 ID 组合对列表（入队前已解析）
   * @param onProgress - 进度回调
   */
  async generateSummariesWithProgress(
    dto: TriggerSummaryDto,
    userPairs: UserPair[] | undefined,
    onProgress: GenerateProgressCallback,
  ): Promise<{
    successCount: number;
    failedCount: number;
    failedUsers: string[];
    skippedCount: number;
    skippedUsers: string[];
  }> {
    const {
      cadence,
      baseDate = new Date(),
      trackingType = TrackingReportType.PERIODIC_MEETING_SUMMARY,
    } = dto;

    const context = getPeriodContext(cadence);
    if (!context) {
      return {
        successCount: 0,
        failedCount: 0,
        failedUsers: [],
        skippedCount: 0,
        skippedUsers: [],
      };
    }

    const range = getdayRange(cadence, baseDate);

    // 若已传入 userPairs，则按 pair 逐对处理；否则回退到旧逻辑（全量查询）
    const pairs = userPairs?.length
      ? userPairs
      : await this.resolveLegacyPairs(dto);

    if (pairs.length === 0) {
      this.logger.warn(
        `[PeriodicReportGenerator] cadence=${cadence} 无可用用户对，跳过生成。`,
      );
      return {
        successCount: 0,
        failedCount: 0,
        failedUsers: [],
        skippedCount: 0,
        skippedUsers: [],
      };
    }

    await onProgress({ type: 'start', totalUsers: pairs.length });

    let successCount = 0;
    let failedCount = 0;
    const failedUsers: string[] = [];
    const skippedUsers: string[] = [];

    // 逐对处理：每个 pair 独立查询源数据并生成报告
    for (let i = 0; i < pairs.length; i += 5) {
      await Promise.all(
        pairs.slice(i, i + 5).map(async (pair) => {
          const { platformUserId } = pair;
          try {
            const sources = await this.findSources(
              context.sourceCadence,
              range,
              [platformUserId],
              trackingType,
            );

            if (sources.length === 0) {
              skippedUsers.push(platformUserId);
              await onProgress({
                type: 'failure',
                platformUserId,
                error: '该周期无源数据',
              });
              return;
            }

            await this.generateOne(
              cadence,
              range,
              context.label,
              sources,
              trackingType,
            );
            successCount++;
            await onProgress({ type: 'success', platformUserId });
          } catch (err: unknown) {
            const errorMessage =
              err instanceof Error ? err.message : String(err);
            failedCount++;
            failedUsers.push(platformUserId);
            this.logger.error(
              `生成用户 ${platformUserId} 的 ${cadence} 报告失败: ${errorMessage}`,
            );
            await onProgress({
              type: 'failure',
              platformUserId,
              error: errorMessage,
            });
          }
        }),
      );
    }

    return {
      successCount,
      failedCount,
      failedUsers,
      skippedCount: skippedUsers.length,
      skippedUsers,
    };
  }

  /**
   * 旧版兼容逻辑：根据 dto 中的 subjectUserIds/platformUserIds 单向解析用户对。
   * 当 userPairs 未传入时使用。
   */
  private async resolveLegacyPairs(
    dto: TriggerSummaryDto,
  ): Promise<UserPair[]> {
    const { platformUserIds, subjectUserIds } = dto;
    let targetPlatformUserIds = platformUserIds;

    if (platformUserIds?.length || subjectUserIds?.length) {
      const pIdSet = new Set(platformUserIds || []);
      if (subjectUserIds?.length) {
        const usersBySubject = await this.prisma.platformUser.findMany({
          where: { localUserId: { in: subjectUserIds }, deletedAt: null },
          select: { id: true, localUserId: true },
        });
        usersBySubject.forEach((u) => {
          pIdSet.add(u.id);
        });
      }
      if (pIdSet.size > 0) {
        targetPlatformUserIds = [...pIdSet];
      }
    }

    if (!targetPlatformUserIds?.length) return [];

    const platformUsers = await this.prisma.platformUser.findMany({
      where: { id: { in: targetPlatformUserIds }, deletedAt: null },
      select: { id: true, localUserId: true },
    });

    return platformUsers
      .filter((u) => u.localUserId)
      .map((u) => ({
        subjectUserId: u.localUserId!,
        platformUserId: u.id,
      }));
  }

  private async findSources(
    sourceCadence: TrackingCadence | 'RECORDING',
    range: { periodStart: Date; periodEnd: Date },
    platformUserIds?: string[],
    trackingType: TrackingReportType = TrackingReportType.PERIODIC_MEETING_SUMMARY,
  ): Promise<Source[]> {
    if (sourceCadence === 'RECORDING') {
      const rows = await this.summaryRepo.findForPeriodicReport(
        range,
        platformUserIds,
      );
      return rows.map((row) => ({
        id: row.id,
        content: row.partSummary,
        userName: row.userName,
        periodStart: row.observedStartAt,
        periodEnd: row.observedEndAt,
        subjectUserId: row.platformUser.localUserId,
        platformUserId: row.platformUserId,
        kind: 'recording',
      }));
    }

    const rows = await this.reportRepo.findPeriodicSummaries(
      sourceCadence,
      range,
      platformUserIds,
      trackingType,
    );

    return rows.map((row) => ({
      id: row.id,
      content: row.content,
      userName: row.subjectNameSnapshot,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      subjectUserId: row.subjectUserId,
      platformUserId: row.platformUserId,
      kind: 'report',
    }));
  }

  private async generateOne(
    cadence: TrackingCadence,
    range: { periodStart: Date; periodEnd: Date },
    label: string,
    sources: Source[],
    trackingType: TrackingReportType,
  ) {
    if (!sources.length) return;

    const [{ userName, subjectUserId, platformUserId }] = sources;

    const { systemPrompt, prompt } = generatePrompt('PERIOD_SUMMARY', {
      userName,
      ctxLabel: label,
      leanSummaries: sources.map((s) => ({
        userName: s.userName,
        partSummary: s.content,
        periodStart: s.periodStart,
        periodEnd: s.periodEnd,
      })),
    });

    const content = await this.llmService.createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ]);

    await this.reportService.create(
      {
        subjectUserId: subjectUserId || undefined,
        platformUserId: platformUserId || undefined,
        subjectNameSnapshot: userName,
        trackingType,
        cadence,
        ...range,
        // 注意：周期边界基于 UTC 计算，与 Asia/Shanghai 时区存在 −8h 偏移。
        // 因此 DAILY 边界是 UTC 00:00，对应上海时间 08:00。2026-09进行全局周期边界一致性重构。
        timezone: 'Asia/Shanghai',
        content: content || '',
        structuredData: {},
        recordingSummaryIds: sources
          .filter((s) => s.kind === 'recording')
          .map((s) => s.id),
        sourceReportIds: sources
          .filter((s) => s.kind === 'report')
          .map((s) => s.id),
      },
      { generatedBy: GenerationMethod.AI, aiModel: this.config.model },
    );

    this.logger.log(`已生成 ${userName} 的 ${cadence} 长期追踪报告`);
  }
}
