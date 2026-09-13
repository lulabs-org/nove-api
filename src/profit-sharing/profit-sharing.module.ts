import { Module } from '@nestjs/common';
import { ProfitSharingRuleController } from './controllers/profit-sharing-rule.controller';
import { ProfitSharingRecordController } from './controllers/profit-sharing-record.controller';
import { ProfitSharingPayslipController } from './controllers/profit-sharing-payslip.controller';
import { ProfitSharingRuleService } from './services/profit-sharing-rule.service';
import { ProfitSharingRecordService } from './services/profit-sharing-record.service';
import { ProfitSharingPayslipService } from './services/profit-sharing-payslip.service';
import { ProfitSharingService } from './services/profit-sharing.service';
import { ProfitSharingRuleRepository } from './repositories/profit-sharing-rule.repository';
import { ProfitSharingRecordRepository } from './repositories/profit-sharing-record.repository';
import { ProfitSharingCron } from './tasks/profit-sharing.cron';
import { ProfitSharingSubscriber } from './listeners/profit-sharing.subscriber';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    ProfitSharingRuleController,
    ProfitSharingRecordController,
    ProfitSharingPayslipController,
  ],
  providers: [
    ProfitSharingRuleRepository,
    ProfitSharingRecordRepository,
    ProfitSharingRuleService,
    ProfitSharingRecordService,
    ProfitSharingPayslipService,
    ProfitSharingService,
    ProfitSharingCron,
    ProfitSharingSubscriber,
  ],
  exports: [ProfitSharingService, ProfitSharingPayslipService],
})
export class ProfitSharingModule {}
