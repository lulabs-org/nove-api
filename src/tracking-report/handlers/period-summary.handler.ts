import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { ITaskHandler } from '@/task/handlers/task-handler.interface';
import { TaskHandlerRegistry } from '@/task/handlers/task-handler.registry';
import { PeriodicReportGenerator } from '../services/periodic-report.generator';
import { TrackingCadence } from '@prisma/client';

@Injectable()
export class PeriodSummaryHandler implements ITaskHandler, OnModuleInit {
  private readonly logger = new Logger(PeriodSummaryHandler.name);
  readonly name = 'generate_period_summary';

  constructor(
    private readonly periodicReportGenerator: PeriodicReportGenerator,
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

    this.logger.log(
      `Executing period summary task for cadence: ${cadence}`,
    );

    // Call the service directly
    const result = await this.periodicReportGenerator.generateSummaries({
      cadence: cadence,
    });
    this.logger.log(`[定时任务] ${cadence} 总结任务执行完成:`, result);

    return { ok: true, data: result };
  }
}
