import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { ITaskHandler } from '@/task/handlers/task-handler.interface';
import { TaskHandlerRegistry } from '@/task/handlers/task-handler.registry';
import { PeriodSummaryService } from '../services/period-summary.service';
import { PeriodType } from '@prisma/client';

@Injectable()
export class PeriodSummaryHandler implements ITaskHandler, OnModuleInit {
  private readonly logger = new Logger(PeriodSummaryHandler.name);
  readonly name = 'generate_period_summary';

  constructor(
    private readonly summaryService: PeriodSummaryService,
    private readonly registry: TaskHandlerRegistry,
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async handle(job: Job): Promise<unknown> {
    const jobData = job.data as {
      periodType?: PeriodType;
      payload?: { periodType?: PeriodType };
    };
    const periodType: PeriodType | undefined =
      jobData?.periodType || jobData?.payload?.periodType;

    if (!periodType) {
      this.logger.warn(
        'generate_period_summary: periodType is missing in job data',
      );
      throw new Error('periodType is required for generating period summary');
    }

    this.logger.log(
      `Executing period summary task for periodType: ${periodType}`,
    );

    // Call the service directly
    const result = await this.summaryService.generateSummaries({ periodType: periodType as PeriodType });
    this.logger.log(`[定时任务] ${periodType} 总结任务执行完成:`, result);

    return { ok: true, data: result };
  }
}
