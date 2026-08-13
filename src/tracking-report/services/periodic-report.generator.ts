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
import { RecordingParticipantSummaryRepository } from '@/meeting/repositories/participant-summary.repository';
import { TrackingReportRepository } from '../repositories/tracking-report.repository';
import { TrackingReportService } from './tracking-report.service';
import { TriggerSummaryDto } from '../dto/tracking-report.dto';
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
    private readonly trackingReportRepository: TrackingReportRepository,
    private readonly recordingSummaryRepository: RecordingParticipantSummaryRepository,
    private readonly trackingReportService: TrackingReportService,
    private readonly llmService: LlmService,
    @Inject(openaiConfig.KEY)
    private readonly config: ConfigType<typeof openaiConfig>,
  ) { }

  /**
   * 生成周期性总结
   * @param cadence 周期类型
   * @param baseDate 基准日期，默认为当前时间
   * @param platformUserIds 平台用户ID列表，默认为空（全部）
   * @returns 包含生成状态和时间的响应对象
   */
  async generateSummaries({ cadence, baseDate = new Date(), platformUserIds }: TriggerSummaryDto) {
    const context = getPeriodContext(cadence);
    if (!context) return { ok: false, at: new Date().toISOString() };

    const range = getdayRange(cadence, baseDate);
    const sources = await this.findSources(context.sourceCadence, range, platformUserIds);

    const groups = new Map<string, Source[]>();
    for (const source of sources) {
      const key = source.subjectUserId || source.platformUserId || 'unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(source);
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
      const rows = await this.recordingSummaryRepository.findForPeriodicReport(range, platformUserIds);
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

    const rows = await this.trackingReportRepository.findPeriodicMeetingSummaries(
      sourceCadence,
      range,
      platformUserIds,
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

    await this.trackingReportService.create(
      {
        subjectUserId: subjectUserId || undefined,
        platformUserId: platformUserId || undefined,
        subjectNameSnapshot: userName,
        trackingType: TrackingReportType.PERIODIC_MEETING_SUMMARY,
        cadence,
        ...range,
        timezone: 'Asia/Shanghai',
        content: content || '',
        structuredData: {},
        recordingSummaryIds: sources.filter((s) => s.kind === 'recording').map((s) => s.id),
        sourceReportIds: sources.filter((s) => s.kind === 'report').map((s) => s.id),
      },
      { generatedBy: GenerationMethod.AI, aiModel: this.config.model },
    );

    this.logger.log(`已生成 ${userName} 的 ${cadence} 长期追踪报告`);
  }

  private async runBatched<T>(items: T[], concurrency: number, fn: (item: T) => Promise<unknown>) {
    for (let i = 0; i < items.length; i += concurrency) {
      await Promise.all(items.slice(i, i + concurrency).map(fn));
    }
  }
}
