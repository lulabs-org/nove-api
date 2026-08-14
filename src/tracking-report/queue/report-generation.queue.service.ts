import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { TrackingCadence, TrackingReportType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TriggerSummaryDto } from '../dto/tracking-report.dto';
import {
  JobStatusResponseDto,
  TriggerResponseDto,
  GenerateJobStatus,
} from '../dto/job.dto';
import {
  REPORT_GENERATION_JOB,
  REPORT_GEN_JOB_ID_PREFIX,
  REPORT_GENERATION_QUEUE,
} from './report-generation.constants';
import type {
  ReportGenerationJobData,
  ReportGenerationJobProgress,
  ReportGenerationJobResult,
  UserPair,
} from './report-generation.processor';
import { TrackingReportRepository } from '../repositories/tracking-report.repository';
import { getdayRange } from '../utils/period-time-range';

/** 不支持通过本接口触发的报告类型 */
const UNSUPPORTED_TRACKING_TYPES: readonly TrackingReportType[] = [
  TrackingReportType.PROJECT_PROGRESS,
];

@Injectable()
export class ReportGenerationQueueService {
  private readonly logger = new Logger(ReportGenerationQueueService.name);

  constructor(
    @InjectQueue(REPORT_GENERATION_QUEUE)
    private readonly queue: Queue<
      ReportGenerationJobData,
      ReportGenerationJobResult
    >,
    private readonly trackingReportRepo: TrackingReportRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Entry point ─────────────────────────────────────────────────────────────

  /**
   * 触发异步生成任务。
   * - 先做双向用户 ID 解析，形成 (subjectUserId, platformUserId) 组合对
   * - BullMQ 的 jobId 自动去重，同一周期不会重复入队
   * - 已有报告时追加新版本，不再拒绝
   * - 周期未结束时附加 dataWarning 提示
   */
  async enqueue(dto: TriggerSummaryDto): Promise<TriggerResponseDto> {
    const trackingType =
      dto.trackingType ?? TrackingReportType.PERIODIC_MEETING_SUMMARY;
    if (UNSUPPORTED_TRACKING_TYPES.includes(trackingType)) {
      throw new BadRequestException(
        `trackingType=${trackingType} 不支持通过此接口触发。PROJECT_PROGRESS 类型需指定 projectId，请使用项目专属接口。`,
      );
    }

    const baseDate = dto.baseDate ?? new Date();
    const range = getdayRange(dto.cadence, baseDate);
    const { periodStart, periodEnd } = range;

    // 双向用户 ID 解析，形成不重合的 (subjectUserId, platformUserId) 组合对
    const userPairs = await this.resolveUserPairs(dto);

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

    const jobData: ReportGenerationJobData = {
      cadence: dto.cadence,
      baseDate: baseDate.toISOString(),
      platformUserIds: dto.platformUserIds,
      subjectUserIds: dto.subjectUserIds,
      userPairs,
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
      `[ReportGeneration] 入队成功: cadence=${dto.cadence} period=${periodStart.toISOString()}~${periodEnd.toISOString()} jobId=${jobId} pairs=${userPairs.length}`,
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
    const progress = job.progress as
      | number
      | ReportGenerationJobProgress
      | undefined;
    const result = job.returnvalue as ReportGenerationJobResult | undefined;

    const response: JobStatusResponseDto = {
      jobId,
      status,
      cadence: job.data.cadence,
      enqueuedAt: new Date(job.timestamp).toISOString(),
      startedAt: job.processedOn
        ? new Date(job.processedOn).toISOString()
        : undefined,
      completedAt: job.finishedOn
        ? new Date(job.finishedOn).toISOString()
        : undefined,
      dataWarning: job.data.dataWarning,
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

  /**
   * 双向用户 ID 解析，形成不重合的 (subjectUserId, platformUserId) 组合对列表。
   *
   * 规则：
   * - 若 subjectUserIds 不为空：先找 platformUserIds → 再反查这些 platformUserIds 关联的所有 subjectUserIds → 形成 pair
   * - 若 subjectUserIds 为空：从 platformUserIds 找到所有关联的 subjectUserIds → 形成 pair
   * - 最终返回去重的 {subjectUserId, platformUserId} 组合列表
   */
  private async resolveUserPairs(dto: TriggerSummaryDto): Promise<UserPair[]> {
    const { subjectUserIds, platformUserIds } = dto;

    // 无任何用户指定时，返回空列表
    if (!subjectUserIds?.length && !platformUserIds?.length) {
      return [];
    }

    let resolvedSubjectIds: string[] = [];
    let resolvedPlatformIds: string[] = [];

    if (subjectUserIds?.length) {
      // 方向 1: subjectUserIds → platformUserIds
      const platformUsers = await this.prisma.platformUser.findMany({
        where: { localUserId: { in: subjectUserIds }, deletedAt: null },
        select: { id: true, localUserId: true },
      });
      resolvedPlatformIds = [...new Set(platformUsers.map((u) => u.id))];

      // 方向 2: 反查这些 platformUserIds 关联的所有 subjectUserIds
      const reverseUsers = await this.prisma.platformUser.findMany({
        where: { id: { in: resolvedPlatformIds }, deletedAt: null },
        select: { id: true, localUserId: true },
      });
      resolvedSubjectIds = [
        ...new Set(
          reverseUsers.map((u) => u.localUserId).filter(Boolean) as string[],
        ),
      ];
    } else {
      // subjectUserIds 为空，从 platformUserIds 找所有关联的 subjectUserIds
      resolvedPlatformIds = platformUserIds ?? [];

      const platformUsers = await this.prisma.platformUser.findMany({
        where: { id: { in: resolvedPlatformIds }, deletedAt: null },
        select: { id: true, localUserId: true },
      });
      resolvedSubjectIds = [
        ...new Set(
          platformUsers.map((u) => u.localUserId).filter(Boolean) as string[],
        ),
      ];
    }

    // 最终查询：获取所有 (subjectUserId, platformUserId) 组合对
    const allPlatformUsers = await this.prisma.platformUser.findMany({
      where: {
        localUserId: { in: resolvedSubjectIds },
        id: { in: resolvedPlatformIds },
        deletedAt: null,
      },
      select: { id: true, localUserId: true },
    });

    const pairs: UserPair[] = allPlatformUsers
      .filter((u) => u.localUserId)
      .map((u) => ({
        subjectUserId: u.localUserId!,
        platformUserId: u.id,
      }));

    // 去重
    const seen = new Set<string>();
    return pairs.filter((p) => {
      const key = `${p.subjectUserId}:${p.platformUserId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

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
