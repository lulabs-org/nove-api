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
import { TrackingReportService } from './tracking-report.service';
import { getdayRange, getPeriodContext } from '../utils/period-time-range';

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

@Injectable()
export class PeriodicReportGenerator {
  private readonly logger = new Logger(PeriodicReportGenerator.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly trackingReportService: TrackingReportService,
    private readonly llmService: LlmService,
    @Inject(openaiConfig.KEY)
    private readonly config: ConfigType<typeof openaiConfig>,
  ) {}

  async generateSummaries(params: {
    periodType: TrackingCadence;
    targetDate?: Date;
    platformUserIds?: string[];
  }) {
    const {
      periodType: cadence,
      targetDate = new Date(),
      platformUserIds,
    } = params;
    const context = getPeriodContext(cadence);
    if (!context) return { ok: false, at: new Date().toISOString() };
    const range = getdayRange(cadence, targetDate);
    const sources = await this.findSources(
      context.sourceCadence,
      range,
      platformUserIds,
    );
    const groups = new Map<string, Source[]>();
    for (const source of sources) {
      const key = source.subjectUserId
        ? `user:${source.subjectUserId}`
        : `platform:${source.platformUserId}`;
      groups.set(key, [...(groups.get(key) ?? []), source]);
    }
    await this.runBatched([...groups.values()], 5, (items) =>
      this.generateOne(cadence, range, context.label, items),
    );
    return { ok: true, at: new Date().toISOString() };
  }

  private async findSources(
    sourceCadence: TrackingCadence | 'RECORDING',
    range: { periodStart: Date; periodEnd: Date },
    platformUserIds?: string[],
  ): Promise<Source[]> {
    if (sourceCadence === 'RECORDING') {
      const rows = await this.prisma.recordingParticipantSummary.findMany({
        where: {
          platformUserId: platformUserIds?.length
            ? { in: platformUserIds }
            : undefined,
          isLatest: true,
          deletedAt: null,
          OR: [
            {
              observedStartAt: { gte: range.periodStart, lte: range.periodEnd },
            },
            {
              observedStartAt: null,
              createdAt: { gte: range.periodStart, lte: range.periodEnd },
            },
          ],
        },
        include: { platformUser: { select: { localUserId: true } } },
      });
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
    const rows = await this.prisma.userTrackingReport.findMany({
      where: {
        trackingType: TrackingReportType.PERIODIC_MEETING_SUMMARY,
        cadence: sourceCadence,
        platformUserId: platformUserIds?.length
          ? { in: platformUserIds }
          : undefined,
        periodStart: { gte: range.periodStart },
        periodEnd: { lte: range.periodEnd },
        isLatest: true,
        deletedAt: null,
      },
    });
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
  ) {
    if (!sources.length) return;
    const userName = sources[0].userName;
    const { systemPrompt, prompt } = generatePrompt('PERIOD_SUMMARY', {
      userName,
      ctxLabel: label,
      leanSummaries: sources.map((source) => ({
        userName: source.userName,
        partSummary: source.content,
        periodStart: source.periodStart,
        periodEnd: source.periodEnd,
      })),
    });
    const content =
      (await this.llmService.createChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ])) ?? '';
    await this.trackingReportService.create(
      {
        subjectUserId: sources[0].subjectUserId || undefined,
        platformUserId: sources[0].platformUserId || undefined,
        subjectNameSnapshot: userName,
        trackingType: TrackingReportType.PERIODIC_MEETING_SUMMARY,
        cadence,
        periodStart: range.periodStart,
        periodEnd: range.periodEnd,
        timezone: 'Asia/Shanghai',
        content,
        structuredData: {},
        recordingSummaryIds: sources
          .filter((source) => source.kind === 'recording')
          .map((source) => source.id),
        sourceReportIds: sources
          .filter((source) => source.kind === 'report')
          .map((source) => source.id),
      },
      {
        generatedBy: GenerationMethod.AI,
        aiModel: this.config.model,
      },
    );
    this.logger.log(`已生成 ${userName} 的 ${cadence} 长期追踪报告`);
  }

  private async runBatched<T>(
    items: T[],
    concurrency: number,
    fn: (item: T) => Promise<unknown>,
  ) {
    for (let index = 0; index < items.length; index += concurrency) {
      await Promise.all(items.slice(index, index + concurrency).map(fn));
    }
  }
}
