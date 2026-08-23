import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { TrackingReportController } from './controllers/tracking-report.controller';
import { TrackingReportRepository } from './repositories/tracking-report.repository';
import { TrackingReportService } from './services/tracking-report.service';

@Module({
  imports: [PrismaModule],
  controllers: [TrackingReportController],
  providers: [TrackingReportRepository, TrackingReportService],
  exports: [TrackingReportRepository, TrackingReportService],
})
export class TrackingReportModule {}
