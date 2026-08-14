import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { TrackingCadence, TrackingReportType } from '@prisma/client';
import { TriggerSummaryDto } from '../dto/tracking-report.dto';
import {
  JobStatusResponseDto,
  TriggerResponseDto,
  GenerateJobStatus,
} from '../dto/generate-job.dto';
import { REPORT_GENERATION_JOB, REPORT_GEN_JOB_ID_PREFIX, REPORT_GENERATION_QUEUE } from './report-generation.constants';
import type {
  ReportGenerationJobData,
  ReportGenerationJobProgress,
  ReportGenerationJobResult,
} from './report-generation.processor';
import { TrackingReportRepository } from '../repositories/tracking-report.repository';
import { getdayRange } from '../utils/period-time-range';

/** 不支持通过本接口触发的报告类型 */
const UNSUPPORTED_TRACKING_TYPES: readonly TrackingReportType[] = [TrackingReportType.PROJECT_PROGRESS];

@Injectable()
export class ReportGenerationQueueService {
  private readonly logger = new Logger(ReportGenerationQueueService.name);

  constructor(
    @InjectQueue(REPORT_GENERATION_QUEUE)
    private readonly queue: Queue<ReportGenerationJobData, ReportGenerationJobResult>,
    private readonly trackingReportRepo: TrackingReportRepository,
  ) {}

  // ─── Entry point ─────────────────────────────────────────────────────────────

  /**
   * 触发异步生成任务。
   * - BullMQ 的 jobId 自动去重，同一周期不会重复入队
   * - 非 force 模式下检查 DB 是否已有报告，已有则拦截
   * - 周期未结束时附加 dataWarning 提示
   */
  async enqueue(dto: TriggerSummaryDto): Promise<TriggerResponseDto> {
    const trackingType = dto.trackingType ?? TrackingReportType.PERIODIC_MEETING_SUMMARY;
    if (UNSUPPORTED_TRACKING_TYPES.includes(trackingType)) {
      throw new BadRequestException(
        `trackingType=${trackingType} 不支持通过此接口触发。PROJECT_PROGRESS 类型需指定 projectId，请使用项目专属接口。`,
      );
    }

    const baseDate = dto.baseDate ?? new Date();
    const range = getdayRange(dto.cadence, baseDate);
    const { periodStart, periodEnd } = range;

    const jobId = this.buildJobId(dto.cadence, periodStart);

    // 检查周期是否已结束，未结束则生成数据完整性警告
    const now = new Date();
    const dataWarning =
      periodEnd > now
        ? `注意：该 ${dto.cadence} 周期尚未结束（结束于 ${periodEnd.toISOString()}），生成的报告可能不完整`
        : undefined;

    if (dataWarning) {
      this.logger.warn(`[ReportGeneration] ⚠️ ${dataWarning}`);
    }

    // 非 force 模式下检查 DB 是否已有该周期的报告
    if (!dto.force) {
      const existingCount = await this.trackingReportRepo.countByPeriod({
        cadence: dto.cadence,
        periodStart,
        periodEnd,
        trackingType,
        platformUserIds: dto.platformUserIds,
      });

      if (existingCount > 0) {
        throw new ConflictException({
          message: `该 ${dto.cadence} 周期已生成过 ${existingCount} 条报告，如需重新生成请传入 force=true`,
          existingCount,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          hint: '若为补跑或纠错，请设置 force=true',
        });
      }
    }

    const jobData: ReportGenerationJobData = {
      cadence: dto.cadence,
      baseDate: baseDate.toISOString(),
      platformUserIds: dto.platformUserIds,
      subjectUserIds: dto.subjectUserIds,
      trackingType,
      force: dto.force,
      dataWarning,
    };

    await this.queue.add(REPORT_GENERATION_JOB, jobData, {
      jobId,
      removeOnComplete: { age: 60 * 60 * 24, count: 10 },
      removeOnFail: { age: 60 * 60 * 48, count: 10 },
      attempts: 1,
    });

    this.logger.log(
      `[ReportGeneration] 入队成功: cadence=${dto.cadence} period=${periodStart.toISOString()}~${periodEnd.toISOString()} jobId=${jobId}`,
    );

    return {
      jobId,
      status: 'queued',
      cadence: dto.cadence,
      ...(dataWarning && { dataWarning }),
    };
  }

  // ─── Status query ─────────────────────────────────────────────────────────────

  async getJobStatus(jobId: string): Promise<JobStatusResponseDto> {
    const job = await this.queue.getJob(jobId);

    if (!job) {
      return {
        jobId,
        status: 'expired',
        cadence: jobId.split(':')[1] as TrackingCadence | undefined,
        note: 'Job 不存在或已超过保留期限（24h 完成 / 48h 失败后自动清理）',
      } as JobStatusResponseDto;
    }

    const state = await job.getState();
    const status = this.mapState(state);
    const progress = job.progress as number | ReportGenerationJobProgress | undefined;
    const result = job.returnvalue as ReportGenerationJobResult | undefined;

    const response: JobStatusResponseDto = {
      jobId,
      status,
      cadence: (job.data as ReportGenerationJobData).cadence,
      enqueuedAt: new Date(job.timestamp).toISOString(),
      startedAt: job.processedOn ? new Date(job.processedOn).toISOString() : undefined,
      completedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : undefined,
      dataWarning: (job.data as ReportGenerationJobData).dataWarning,
    };

    if (typeof progress === 'number') {
      response.progress = progress;
    } else if (progress && typeof progress === 'object') {
      response.progress = Math.round(
        (progress.processedUsers / (progress.totalUsers || 1)) * 100,
      );
    }

    if (result) {
      response.successCount = result.successCount;
      response.failedCount = result.failedCount;
      response.failedUsers = result.failedUsers;
      response.skippedCount = result.skippedCount;
      response.skippedUsers = result.skippedUsers;
      response.completedAt = result.completedAt;
      if (result.dataWarning) response.dataWarning = result.dataWarning;
    }

    if (state === 'failed') {
      response.error = job.failedReason ?? '未知错误';
    }

    return response;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private buildJobId(cadence: TrackingCadence, periodStart: Date): string {
    return `${REPORT_GEN_JOB_ID_PREFIX}:${cadence}:${periodStart.getTime()}`;
  }

  private readonly STATE_MAP: Record<string, GenerateJobStatus> = {
    waiting: 'queued',
    delayed: 'queued',
    active: 'active',
    completed: 'completed',
    failed: 'failed',
  };

  private mapState(state: string): GenerateJobStatus {
    return this.STATE_MAP[state] ?? 'unknown';
  }
}
