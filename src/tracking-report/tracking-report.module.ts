import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { TrackingReportController } from './tracking-report.controller';
import { TrackingReportRepository } from './tracking-report.repository';
import { TrackingReportService } from './tracking-report.service';

@Module({
  imports: [PrismaModule],
  controllers: [TrackingReportController],
  providers: [TrackingReportRepository, TrackingReportService],
  exports: [TrackingReportRepository, TrackingReportService],
})
export class TrackingReportModule {}
