import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { TrackingCadence, TrackingReportType } from '@prisma/client';
import { RedisService } from '@/redis/redis.service';
import { TriggerSummaryDto } from '../dto/tracking-report.dto';
import {
  JobStatusResponseDto,
  TriggerResponseDto,
  GenerateJobStatus,
} from '../dto/generate-job.dto';
import {
  REPORT_GENERATION_JOB,
  REPORT_GEN_JOB_ID_PREFIX,
  REPORT_GENERATION_QUEUE,
} from './report-generation.constants';
import type {
  ReportGenerationJobData,
  ReportGenerationJobProgress,
  ReportGenerationJobResult,
} from './report-generation.processor';
import { TrackingReportRepository } from '../repositories/tracking-report.repository';
import { getdayRange } from '../utils/period-time-range';

/** 不支持通过本接口触发的报告类型 */
const UNSUPPORTED_TRACKING_TYPES = [TrackingReportType.PROJECT_PROGRESS] as const;

@Injectable()
export class ReportGenerationQueueService {
  private readonly logger = new Logger(ReportGenerationQueueService.name);

  /** 锁的有效期：2 小时（ms），作为超时兜底 */
  private static readonly LOCK_TTL_MS = 2 * 60 * 60 * 1000;

  constructor(
    @InjectQueue(REPORT_GENERATION_QUEUE)
    private readonly queue: Queue<ReportGenerationJobData, ReportGenerationJobResult>,
    private readonly redisService: RedisService,
    private readonly trackingReportRepo: TrackingReportRepository,
  ) {}

  // ─── Lock helpers ────────────────────────────────────────────────────────────

  /**
   * Fix 4: 锁 key 和 jobId 包含具体的周期起始时间戳，
   * 使不同周期的任务（如本周 vs 上周 backfill）可以并行，
   * 而同一周期的重复触发仍会被拦截。
   */
  private buildLockKey(cadence: TrackingCadence, periodStart: Date): string {
    return `lock:${REPORT_GEN_JOB_ID_PREFIX}:${cadence}:${periodStart.getTime()}`;
  }

  private buildJobId(cadence: TrackingCadence, periodStart: Date): string {
    return `${REPORT_GEN_JOB_ID_PREFIX}:${cadence}:${periodStart.getTime()}`;
  }

  /**
   * 通过完整 lockKey 释放锁（供 Processor 在任务完成/失败后调用）
   */
  async releaseLockByKey(lockKey: string): Promise<void> {
    const client = this.redisService.getClient();
    if (!client) return;
    await client.del(lockKey);
    this.logger.debug(`[ReportGeneration] 锁已释放: ${lockKey}`);
  }

  // ─── Entry point ─────────────────────────────────────────────────────────────

  /**
   * 触发异步生成任务，整合所有产品逻辑防护：
   *
   * Fix 6: 校验 trackingType，拒绝不支持的类型
   * Fix 4: lockKey 包含周期时间戳，支持不同周期并行
   * Fix 5: 检查周期是否已结束，未结束则附加 dataWarning
   * Fix 2: 检查 DB 是否已有该周期的报告（可用 force=true 跳过）
   * Fix 1（配合）: 所有触发路径统一走此方法
   * 原有: Redis SET NX 原子锁防止并发重复触发
   */
  async enqueue(dto: TriggerSummaryDto): Promise<TriggerResponseDto> {
    // Fix 6: PROJECT_PROGRESS 需要 projectId，当前接口不支持
    const trackingType = dto.trackingType ?? TrackingReportType.PERIODIC_MEETING_SUMMARY;
    if ((UNSUPPORTED_TRACKING_TYPES as readonly TrackingReportType[]).includes(trackingType)) {
      throw new BadRequestException(
        `trackingType=${trackingType} 不支持通过此接口触发。PROJECT_PROGRESS 类型需指定 projectId，请使用项目专属接口。`,
      );
    }

    const baseDate = dto.baseDate ?? new Date();
    const range = getdayRange(dto.cadence, baseDate);
    const { periodStart, periodEnd } = range;

    const jobId = this.buildJobId(dto.cadence, periodStart);
    const lockKey = this.buildLockKey(dto.cadence, periodStart);

    const client = this.redisService.getClient();
    if (!client) {
      throw new Error('Redis 不可用，无法保证任务去重');
    }

    // Fix 5: 检查周期是否已结束，未结束则生成数据完整性警告
    const now = new Date();
    const dataWarning =
      periodEnd > now
        ? `注意：该 ${dto.cadence} 周期尚未结束（结束于 ${periodEnd.toISOString()}），生成的报告可能不完整`
        : undefined;

    if (dataWarning) {
      this.logger.warn(`[ReportGeneration] ⚠️ ${dataWarning}`);
    }

    // Fix 2: 检查 DB 是否已有该周期的报告（非 force 模式下拦截）
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

    // 原子锁：SET NX PX，仅当 key 不存在时才设置（防并发重复触发）
    const acquired = await client.set(
      lockKey,
      jobId,
      'PX',
      ReportGenerationQueueService.LOCK_TTL_MS,
      'NX',
    );

    if (acquired === null) {
      const runningJobId = (await client.get(lockKey)) ?? jobId;
      this.logger.warn(
        `[ReportGeneration] 重复触发被拦截: cadence=${dto.cadence} periodStart=${periodStart.toISOString()} runningJobId=${runningJobId}`,
      );
      throw new ConflictException({
        message: `相同 cadence + 周期的任务正在运行，请稍后再试`,
        runningJobId,
      });
    }

    const jobData: ReportGenerationJobData = {
      cadence: dto.cadence,
      baseDate: baseDate.toISOString(),
      platformUserIds: dto.platformUserIds,
      subjectUserIds: dto.subjectUserIds,
      trackingType,
      force: dto.force,
      periodLockKey: lockKey,
      dataWarning,
    };

    try {
      await this.queue.add(REPORT_GENERATION_JOB, jobData, {
        jobId,
        removeOnComplete: { age: 60 * 60 * 24, count: 10 },
        removeOnFail: { age: 60 * 60 * 48, count: 10 },
        attempts: 1,
      });
    } catch (err) {
      await client.del(lockKey);
      throw err;
    }

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
        cadence: this.parseCadenceFromJobId(jobId),
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

  /** 从 jobId 反解 cadence（格式: report-gen:{cadence}:{timestamp}） */
  private parseCadenceFromJobId(jobId: string): TrackingCadence | undefined {
    const parts = jobId.split(':');
    return parts[1] as TrackingCadence | undefined;
  }

  private mapState(state: string): GenerateJobStatus {
    switch (state) {
      case 'waiting':
      case 'delayed':
        return 'queued';
      case 'active':
        return 'active';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'unknown';
    }
  }
}
