import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';
import { Job } from 'bullmq';
import { ITaskHandler } from '@/task/handlers/task-handler.interface';
import { TaskHandlerRegistry } from '@/task/handlers/task-handler.registry';
import { TrackingCadence } from '@prisma/client';
import { ReportGenerationQueueService } from '../queue/report-generation.queue.service';

/**
 * Fix 1: 定时任务统一走 ReportGenerationQueueService.enqueue()，
 * 与 HTTP 接口共享同一把 Redis 分布式锁和业务防重逻辑，
 * 彻底消除两条触发链路互相打架的问题。
 *
 * 历史做法（直接调用 generateSummaries）已废弃：
 *   this.periodicReportGenerator.generateSummaries({ cadence })
 */
@Injectable()
export class PeriodSummaryHandler implements ITaskHandler, OnModuleInit {
  private readonly logger = new Logger(PeriodSummaryHandler.name);
  readonly name = 'generate_period_summary';

  constructor(
    private readonly reportGenerationQueue: ReportGenerationQueueService,
    private readonly registry: TaskHandlerRegistry,
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async handle(job: Job): Promise<unknown> {
    const jobData = job.data as {
      cadence?: TrackingCadence;
      payload?: { cadence?: TrackingCadence };
    };
    const cadence: TrackingCadence | undefined =
      jobData?.cadence || jobData?.payload?.cadence;

    if (!cadence) {
      this.logger.warn(
        'generate_period_summary: cadence is missing in job data',
      );
      throw new Error('cadence is required for generating period summary');
    }

    this.logger.log(`[定时任务] 触发 ${cadence} 周期总结生成，通过队列异步执行`);

    try {
      const result = await this.reportGenerationQueue.enqueue({ cadence });
      this.logger.log(
        `[定时任务] ${cadence} 总结任务已入队: jobId=${result.jobId}`,
      );
      return { ok: true, jobId: result.jobId };
    } catch (err) {
      if (err instanceof ConflictException) {
        // 已有任务在运行（锁冲突）或已有报告（业务防重）：记录日志后正常返回，
        // 避免定时任务因 409 而标记为失败并触发重试
        const body = err.getResponse() as Record<string, unknown>;
        this.logger.warn(
          `[定时任务] ${cadence} 总结生成被跳过（已存在或正在运行）: ${JSON.stringify(body)}`,
        );
        return { ok: true, skipped: true, reason: body };
      }
      throw err;
    }
  }
}
