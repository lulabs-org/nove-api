import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { PrismaModule } from '@/prisma/prisma.module';
import { TrackingReportController } from './controllers/tracking-report.controller';
import { TrackingReportRepository } from './repositories/tracking-report.repository';
import { TrackingReportService } from './services/tracking-report.service';
import { PeriodicReportGenerator } from './services/periodic-report.generator';
import { PeriodSummaryHandler } from './handlers/period-summary.handler';
import { LlmModule } from '@/llm/llm.module';
import { ConfigModule } from '@nestjs/config';
import { openaiConfig } from '@/configs/openai.config';
import { TasksModule } from '@/task/tasks.module';
import { MeetingModule } from '@/meeting/meeting.module';
import { MinuteModule } from '@/minute/minute.module';
import { REPORT_GENERATION_QUEUE } from './queue/report-generation.constants';
import { ReportGenerationProcessor } from './queue/report-generation.processor';
import { ReportGenerationQueueService } from './queue/report-generation.queue.service';

@Module({
  imports: [
    PrismaModule,
    LlmModule,
    ConfigModule.forFeature(openaiConfig),
    TasksModule,
    MeetingModule,
    MinuteModule,
    BullModule.registerQueue({
      name: REPORT_GENERATION_QUEUE,
    }),
    BullBoardModule.forFeature({
      name: REPORT_GENERATION_QUEUE,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [TrackingReportController],
  providers: [
    TrackingReportRepository,
    TrackingReportService,
    PeriodicReportGenerator,
    PeriodSummaryHandler,
    ReportGenerationProcessor,
    ReportGenerationQueueService,
  ],
  exports: [
    TrackingReportRepository,
    TrackingReportService,
    PeriodicReportGenerator,
  ],
})
export class TrackingReportModule { }
