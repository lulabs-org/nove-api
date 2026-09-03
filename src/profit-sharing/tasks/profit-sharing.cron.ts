import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProfitSharingRecordRepository } from '../repositories/profit-sharing-record.repository';
import { ProfitSharingService } from '../services/profit-sharing.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProfitSharingCron {
  private readonly logger = new Logger(ProfitSharingCron.name);

  constructor(
    private readonly recordRepository: ProfitSharingRecordRepository,
    private readonly profitSharingService: ProfitSharingService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 每天凌晨 1 点执行：将到了结算时间的流水状态更新为 SETTLED
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleSettlement() {
    this.logger.log('Start automatic settlement cron job...');

    try {
      const result =
        await this.recordRepository.updatePendingRecordsToSettled();

      this.logger.log(
        `Automatic settlement completed. Updated ${result.count} records to SETTLED.`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to execute automatic settlement cron job',
        error,
      );
    }
  }

  /**
   * 每天凌晨 2 点执行：自动巡检所有启用的月度固定分账规则，补齐本月分润流水
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleMonthlyFixedGeneration() {
    this.logger.log('Start automatic monthly fixed profit sharing generation...');

    try {
      const activeFixedRules = await this.prisma.profitShareRule.findMany({
        where: {
          ruleType: 'FIXED_MONTHLY',
          status: 'ACTIVE',
        },
      });

      for (const rule of activeFixedRules) {
        await this.profitSharingService.calculateForSpecificRule(rule.id);
      }
    } catch (error) {
      this.logger.error(
        'Failed to execute monthly fixed profit sharing cron job',
        error,
      );
    }
  }
}
