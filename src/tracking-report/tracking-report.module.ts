import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    PrismaModule,
    LlmModule,
    ConfigModule.forFeature(openaiConfig),
    TasksModule
  ],
  controllers: [TrackingReportController],
  providers: [
    TrackingReportRepository, 
    TrackingReportService,
    PeriodicReportGenerator,
    PeriodSummaryHandler
  ],
  exports: [
    TrackingReportRepository, 
    TrackingReportService,
    PeriodicReportGenerator
  ],
})
export class TrackingReportModule {}
