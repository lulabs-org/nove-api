import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { TrackingCadence, TrackingReportType } from '@prisma/client';
import { PeriodicReportGenerator } from '../services/periodic-report.generator';
import { TriggerSummaryDto } from '../dto/tracking-report.dto';
import { REPORT_GENERATION_QUEUE } from './report-generation.constants';
import { ReportGenerationQueueService } from './report-generation.queue.service';

/**
 * Redis 中存储的 job 数据——Date 会被序列化为字符串，故 baseDate 是 string。
 * 不继承 TriggerSummaryDto 以避免 Date vs string 的类型冲突。
 */
export interface ReportGenerationJobData {
  cadence: TrackingCadence;
  /** ISO 8601 字符串，processor 内部还原为 Date */
  baseDate?: string;
  platformUserIds?: string[];
  subjectUserIds?: string[];
  trackingType?: TrackingReportType;
  force?: boolean;
  /** 完整的锁 key（含周期时间戳），供 Processor 精确释放 */
  periodLockKey: string;
  /** 数据完整性警告（当周期尚未结束时设置） */
  dataWarning?: string;
}

export interface ReportGenerationJobResult {
  successCount: number;
  failedCount: number;
  failedUsers: string[];
  /** 无会议数据被跳过的用户数 */
  skippedCount: number;
  /** 无会议数据被跳过的 platformUserId 列表 */
  skippedUsers: string[];
  dataWarning?: string;
  completedAt: string;
}

export interface ReportGenerationJobProgress {
  totalUsers: number;
  processedUsers: number;
  successCount: number;
  failedCount: number;
}

@Injectable()
@Processor(REPORT_GENERATION_QUEUE)
export class ReportGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportGenerationProcessor.name);

  constructor(
    private readonly generator: PeriodicReportGenerator,
    private readonly queueService: ReportGenerationQueueService,
  ) {
    super();
  }

  override async process(
    job: Job<ReportGenerationJobData, ReportGenerationJobResult>,
  ): Promise<ReportGenerationJobResult> {
    const dto: TriggerSummaryDto = {
      ...job.data,
      baseDate: job.data.baseDate ? new Date(job.data.baseDate) : undefined,
    };

    this.logger.log(
      `[ReportGeneration] 开始处理 job=${job.id} cadence=${dto.cadence}`,
    );
    if (job.data.dataWarning) {
      this.logger.warn(`[ReportGeneration] ⚠️ ${job.data.dataWarning}`);
    }

    let totalUsers = 0;
    let processedUsers = 0;

    const result = await this.generator.generateSummariesWithProgress(
      dto,
      async (event) => {
        if (event.type === 'start') {
          totalUsers = event.totalUsers;
          this.logger.log(
            `[ReportGeneration] job=${job.id} 共 ${totalUsers} 个有数据的用户需要生成`,
          );
        } else {
          processedUsers++;
          const pct =
            totalUsers > 0
              ? Math.round((processedUsers / totalUsers) * 100)
              : 100;

          // updateProgress 异常单独隔离，不影响用户批处理主流程
          try {
            await job.updateProgress(pct);
          } catch (progressErr: unknown) {
            this.logger.warn(
              `[ReportGeneration] job=${job.id} updateProgress 失败（已忽略）: ${
                progressErr instanceof Error ? progressErr.message : String(progressErr)
              }`,
            );
          }

          this.logger.debug(
            `[ReportGeneration] job=${job.id} 进度 ${pct}% (${processedUsers}/${totalUsers}) - ${event.type}`,
          );
        }
      },
    );

    const jobResult: ReportGenerationJobResult = {
      ...result,
      dataWarning: job.data.dataWarning,
      completedAt: new Date().toISOString(),
    };

    this.logger.log(
      `[ReportGeneration] job=${job.id} 完成: 成功=${result.successCount}, 失败=${result.failedCount}, 跳过=${result.skippedCount}`,
    );

    return jobResult;
  }

  /** 任务正常完成后释放分布式锁 */
  @OnWorkerEvent('completed')
  async onCompleted(job: Job<ReportGenerationJobData>): Promise<void> {
    await this.releaseLockSafely(job);
  }

  /** 任务失败后释放分布式锁（避免锁永久占用） */
  @OnWorkerEvent('failed')
  async onFailed(job: Job<ReportGenerationJobData>, err: Error): Promise<void> {
    this.logger.error(
      `[ReportGeneration] job=${job.id} cadence=${job.data.cadence} 执行失败: ${err.message}`,
    );
    await this.releaseLockSafely(job);
  }

  private async releaseLockSafely(job: Job<ReportGenerationJobData>): Promise<void> {
    try {
      // 使用 job 数据中携带的精确 lockKey 释放（含周期时间戳）
      await this.queueService.releaseLockByKey(job.data.periodLockKey);
    } catch (err: unknown) {
      this.logger.warn(
        `[ReportGeneration] releaseLock 失败（锁将在 TTL 后自动过期）: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
