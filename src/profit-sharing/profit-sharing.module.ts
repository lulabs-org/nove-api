import { Module } from '@nestjs/common';
import { ProfitSharingRuleController } from './controllers/profit-sharing-rule.controller';
import { ProfitSharingRecordController } from './controllers/profit-sharing-record.controller';
import { ProfitSharingRuleService } from './services/profit-sharing-rule.service';
import { ProfitSharingRecordService } from './services/profit-sharing-record.service';
import { ProfitSharingService } from './services/profit-sharing.service';
import { ProfitSharingRuleRepository } from './repositories/profit-sharing-rule.repository';
import { ProfitSharingRecordRepository } from './repositories/profit-sharing-record.repository';
import { ProfitSharingCron } from './tasks/profit-sharing.cron';
import { ProfitSharingSubscriber } from './listeners/profit-sharing.subscriber';
import { PrismaModule } from '../prisma/prisma.module'; // 假设存在 PrismaModule

@Module({
  imports: [PrismaModule],
  controllers: [ProfitSharingRuleController, ProfitSharingRecordController],
  providers: [
    ProfitSharingRuleRepository,
    ProfitSharingRecordRepository,
    ProfitSharingRuleService,
    ProfitSharingRecordService,
    ProfitSharingService,
    ProfitSharingCron,
    ProfitSharingSubscriber,
  ],
  exports: [ProfitSharingService],
})
export class ProfitSharingModule {}
